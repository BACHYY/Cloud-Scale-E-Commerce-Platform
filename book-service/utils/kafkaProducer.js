// utils/kafkaProducer.js
const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "book-svc",
  brokers: (process.env.KAFKA_BROKERS || "").split(","),
  ssl: true,
  sasl: {
    mechanism: "scram-sha-512",
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },
});

const producer = kafka.producer();
producer.connect(); // connect once at start‑up

module.exports = producer;
