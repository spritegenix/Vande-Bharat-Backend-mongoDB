// scripts/seed-fake-users.ts
import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import { env } from "@/config/zodSafeEnv";
import { UserModel } from "@/models/user.model";

const seedFakeUsers = async () => {
  try {
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect("mongodb+srv://toolsspritegenix:mvFpkn0YmdPREvko@cluster0.qtfvgxj.mongodb.net/vandeBharat");
await UserModel.deleteMany({ userId: { $regex: /^fake_user_/ } });

    const fakeUsers = Array.from({ length: 50 }).map((_, i) => ({
       userId: `fake_user_${i}`,
      slug: `fake-user-${i}`,
      email: faker.internet.email(),
      name: faker.person.fullName(),
      role: "user",
      avatar: faker.image.avatar(),
      country: "Bharat",
      isDeleted: false,
      isBlocked: false,
    }));

    await UserModel.insertMany(fakeUsers);
    console.log("✅ 50 fake users seeded successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  }
};

seedFakeUsers();
