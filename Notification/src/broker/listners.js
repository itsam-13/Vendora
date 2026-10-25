const { subscribeToQueue } = require('./broker')
const { sendEmail } = require('../email')

module.exports = function () {

    subscribeToQueue("AUTH_NOTIFICATION.USER_CREATED", async (data) => {

        const emailHTMLTemplate =
            `<h1>Welcome to Our Service!</h1>
                <p>Dear ${(data.fullName.firstName + " " + (data.fullName.lastName || "")).trim()},</p>
                <p>Thank you for registering with us. We're excited to have you on board!</p>
                <p>Best regards,<br />The Team</p>`;

        await sendEmail(data.email, "Welcome to our Service", "Thank you for Registering with us!",emailHTMLTemplate)            

    })
}