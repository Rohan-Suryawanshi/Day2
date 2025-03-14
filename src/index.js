import dotenv from 'dotenv';
import connectDb from "./db/index.js";

dotenv.config({ path: "./env" });
connectDb();

// (async () => {
//   try {
//     const Database = await mongoose.connect(
//       `${process.env.MONGODB_URI}/${DB_NAME}`
//     );
//     console.log("Database Connected Successfully");

//     app.on("error", (err) => {
//       console.error(err);
//       throw err;
//     });

//     app.listen(process.env.PORT, () => {
//       console.log(`Listening on port ${process.env.PORT}`);
//     });
//   } catch (error) {
//     console.error("Database connection failed:", error);
//   }
// })();