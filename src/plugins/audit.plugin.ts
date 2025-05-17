import mongoose, { Schema } from "mongoose";
import { logAudit } from "@/utils/logAudit";

const AUDIT_BEFORE = Symbol("auditBefore");

export function auditPlugin(schema: Schema, options: { modelName: string }) {
  const { modelName } = options;

  function getUserContext(): string | undefined {
    return (mongoose as any).__userContext || undefined;
  }

  function shouldSkipAudit(): boolean {
    return !!(mongoose as any).__skipAudit;
  }

  // Add soft delete fields
  schema.add({
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  });

  schema.path("deletedAt").immutable(true);

  // Soft delete method
  schema.statics.softDelete = async function (id: string) {
    return this.findOneAndUpdate(
      { _id: id },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
  };

  // CREATE / UPDATE via save()
  schema.pre("save", async function (next) {
    if (shouldSkipAudit()) return next();

    const doc = this as any;
    if (!doc.isNew) {
      const existing = await mongoose.model(modelName).findById(doc._id).lean();
      doc[AUDIT_BEFORE] = existing;
    }

    next();
  });

  schema.post("save", async function (doc: any) {
    if (shouldSkipAudit()) return;

    const action = doc.isNew ? "CREATE" : "UPDATE";
    await logAudit({
      modelName: modelName,
      documentId: doc._id.toString(),
      action,
      performedBy: getUserContext(),
      before: doc[AUDIT_BEFORE],
      after: doc.toObject(),
    });
  });

  // UPDATE via findOneAndUpdate
  schema.pre("findOneAndUpdate", async function (next) {
    if (shouldSkipAudit()) return next();

    const doc = await this.model.findOne(this.getQuery()).lean();
    (this as any)[AUDIT_BEFORE] = doc;
    next();
  });

  schema.post("findOneAndUpdate", async function (res: any) {
    if (shouldSkipAudit() || !res) return;

    const before = (this as any)[AUDIT_BEFORE];
    const after = res.toObject();

    const isSoftDelete = before && !before.isDeleted && after.isDeleted;

    await logAudit({
      modelName: modelName,
      documentId: res._id.toString(),
      action: isSoftDelete ? "SOFT_DELETE" : "UPDATE",
      performedBy: getUserContext(),
      before,
      after,
    });
  });

  // Block hard deletes

    // Block hard deletes
    const blockHardDelete = () => {
      throw new Error('❌ Hard deletes are disabled. Use softDelete instead.');
    };
  
    schema.pre('findOneAndDelete', blockHardDelete);
    schema.pre('deleteOne', blockHardDelete);
    schema.pre('deleteMany', blockHardDelete);
}
