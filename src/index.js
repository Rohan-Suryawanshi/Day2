import dotenv from "dotenv";
import connectDb from "./db/index.js";
import { app } from "./app.js";
const PORT = process.env.PORT || 8000;
dotenv.config({ path: "./.env" });
 
connectDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });

    app.on("error", (error) => {
      console.log("ERROR : " + error);
      process.exit(1);
    });
  })
  .catch((error) => {
    console.log("MONGODB Connection FAIL !!" + error);
  });

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
