const amqplib = require('amqplib');


let channel, connection;

// Function to connect to RabbitMQ
async function connect() {
    if (connection) return connection;

    try {
        connection = await amqplib.connect(process.env.RABBIT_URL)
        console.log('Connected to RabbitMQ');
        channel = await connection.createChannel();

    } catch (error) {
        console.error('Error connecting to RabbitMQ:', error);
        throw error;
    }
}

// Function to publish a message to a queue
async function publishToQueue(queueName, data = {}) {
    if (!channel || !connection)  await connect();
        
    await channel.assertQueue(queueName, { 
        durable: true 
    });

    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)))
    console.log(`Message sent to queue ${queueName}:`, data);
}

// Function to subscribe to a queue
async function subscribeToQueue(queueName, callback) {
    if (!channel || !connection) await connect();

    await channel.assertQueue(queueName, { 
        durable: true 
    });

    channel.consume(queueName, async (msg) => {
        if (msg !== null) {
            const data = JSON.parse(msg.content.toString());
            await callback(data);
            channel.ack(msg);
        }
    });
}

module.exports = {
    connect,
    publishToQueue,
    subscribeToQueue,
    channel,
    connection
};