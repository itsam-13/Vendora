require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/database/db");
const { connect } = require("./src/broker/broker")

connectDB();
connect()




app.listen(3003, () => {
    console.log(`Server is running on port 3003`);
});

