const { subscribeToQueue } = require('./broker')
const { sendEmail } = require('../email')

module.exports = function () {

    // User Created Listener 
    subscribeToQueue("AUTH_NOTIFICATION.USER_CREATED", async (data) => {

        const emailHTMLTemplate =
            `<h1>Welcome to Our Service!</h1>
                <p>Dear ${data.username || (data.fullName?.firstName ? (data.fullName.firstName + " " + (data.fullName.lastName || "")).trim() : "User")},</p>
                <p>Thank you for registering with us. We're excited to have you on board!</p>
                <p>Best regards,<br />The Team</p>`;

        await sendEmail(data.email, "Welcome to our Service", "Thank you for Registering with us!", emailHTMLTemplate)

    })

    // Payment Completed Listener 
    subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", async (data) => {
        const emailHTMLTemplate =
            `<h1>Payment Completed</h1>
                <p>Dear ${data.username || "Customer"},</p>
                <p>Thank you for your payment. Your order has been processed successfully.</p>
                <p>Order ID: ${data.orderId}</p>
                <p>Payment ID: ${data.paymentId}</p>
                <p>Amount: ${data.amount} ${data.currency}</p>
                <p>Best regards,<br />The Team</p>`;

        await sendEmail(data.email, "Payment Completed", "Thank you for your payment!", emailHTMLTemplate);
    })

    // Payment Failed Listener 
    subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_FAILED", async (data) => {
        const emailHTMLTemplate =
            `<h1>Payment Failed</h1>
                <p>Dear ${data.username || "Customer"},</p>
                <p>We're sorry, but your payment could not be processed.</p>
                <p>Order ID: ${data.orderId}</p>
                <p>Payment ID: ${data.paymentId}</p>
                <p>Best regards,<br />The Team</p>`;

        await sendEmail(data.email, "Payment Failed", "Sorry, your payment could not be processed!", emailHTMLTemplate);
    })
}