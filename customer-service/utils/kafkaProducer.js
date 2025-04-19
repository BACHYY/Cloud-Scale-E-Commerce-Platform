const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "customer-svc",
  brokers: process.env.KAFKA_BROKERS.split(","), // e.g. "b-1...:9092,b-2...:9092"
  ssl: false,
});

const producer = kafka.producer();
producer.connect();
module.exports = producer;
