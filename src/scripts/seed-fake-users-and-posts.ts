import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import { UserModel } from "@/models/user.model";
import { PostModel } from "@/models/post.model";

const S3_URL = "https://simplicv.s3.ap-south-1.amazonaws.com/posts/blog-02.webp-1748088642152-837270182";
const MONGO_URI = "mongodb+srv://toolsspritegenix:mvFpkn0YmdPREvko@cluster0.qtfvgxj.mongodb.net/vandeBharat";

const seedFakeUsersAndPosts = async () => {
  try {
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);

    // Clean previous fake data
    console.log("🧹 Cleaning up existing fake users and posts...");
    const fakeUsers = await UserModel.find({ userId: { $regex: /^fake_user_/ } }).lean();
    const fakeUserIds = fakeUsers.map((u) => u._id);

    await UserModel.deleteMany({ _id: { $in: fakeUserIds } });
    await PostModel.deleteMany({ userId: { $in: fakeUserIds } });

    // Create fake users
    console.log("👥 Seeding fake users...");
    const fakeUsersData = Array.from({ length: 10 }).map((_, i) => ({
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
    const insertedUsers = await UserModel.insertMany(fakeUsersData);
    console.log("✅ 10 fake users created");

    // Create fake posts
    console.log("📝 Seeding fake posts...");
    const fakePosts = Array.from({ length: 50 }).map(() => {
      const user = insertedUsers[Math.floor(Math.random() * insertedUsers.length)];

      return {
        content: faker.lorem.sentences(),
        tags: faker.lorem.words(3).split(" "),
        userId: user._id, // ✅ Correct: ObjectId reference
        attachments: [
          {
            url: S3_URL,
            type: "IMAGE",
            fileName: `demo${faker.number.int({ min: 1, max: 3 })}.webp`,
            mimeType: "image/webp",
            size: faker.number.int({ min: 150000, max: 500000 }),
            width: 1280,
            height: 720,
            uploadedAt: faker.date.recent({ days: 10 }),
          },
        ],
        isDeleted: false,
        isHidden: false,
        likeCount: faker.number.int({ min: 0, max: 100 }),
        commentCount: faker.number.int({ min: 0, max: 30 }),
        createdAt: faker.date.recent({ days: 5 }),
        updatedAt: new Date(),
      };
    });

    await PostModel.insertMany(fakePosts);
    console.log("✅ 50 fake posts seeded!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  }
};

seedFakeUsersAndPosts();
