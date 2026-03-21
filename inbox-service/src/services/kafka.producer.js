const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'inbox-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
});

const producer = kafka.producer();
let connected = false;

const connect = async () => {
  if (!connected) {
    await producer.connect();
    connected = true;
    console.log('Kafka producer connected');
  }
};

const publish = async (event, data) => {
  await connect();
  const message = {
    event,
    source: 'inbox-service',
    version: '1.0',
    timestamp: new Date().toISOString(),
    data
  };
  await producer.send({
    topic: 'tasky.inbox-events',
    messages: [{ value: JSON.stringify(message) }]
  });
};

const disconnect = async () => {
  if (connected) {
    await producer.disconnect();
    connected = false;
  }
};

module.exports = { publish, disconnect };
