import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import { UserModel } from "@/models/user.model";
import { FollowRequestModel } from "@/models/userFollowRequestModel.model";

const MONGODB_URI = "mongodb+srv://toolsspritegenix:mvFpkn0YmdPREvko@cluster0.qtfvgxj.mongodb.net/vandeBharat";

const toUserId = new mongoose.Types.ObjectId("682d6b6941aa77626751d938"); // ✅ Fixed recipient

const seedFakeUsersWithRequests = async () => {
  try {
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);

    // 🧹 Clean previous fake users
    await UserModel.deleteMany({ userId: { $regex: /^fake_user_/ } });
    console.log("🧼 Removed existing fake users");

    // 🔧 Generate 50 fake users
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

    const insertedUsers = await UserModel.insertMany(fakeUsers);
    console.log("✅ Inserted 50 fake users");

    // 📬 Create follow requests from those users to the fixed toUserId
    const followRequests = insertedUsers.map((user) => ({
      fromUserId: user._id,
      toUserId,
      isDeleted: false,
      deletedAt: null,
      status: "PENDING",
      createdAt: faker.date.recent(10),
      updatedAt: faker.date.recent(5),
    }));

    await FollowRequestModel.insertMany(followRequests);
    console.log(`✅ Created 50 follow requests to user ${toUserId.toHexString()}`);
  } catch (error) {
    console.error("❌ Seeding failed:", JSON.stringify(error, null, 2));
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  }
};

seedFakeUsersWithRequests();
