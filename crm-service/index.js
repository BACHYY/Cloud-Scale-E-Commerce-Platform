const { Kafka } = require("kafkajs");
const AWS = require("aws-sdk");

const kafka = new Kafka({
  clientId: "crm-svc",
  brokers: process.env.KAFKA_BROKERS.split(","),
  ssl: true,
  sasl: {
    mechanism: "scram-sha-512",
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },
});

const ses = new AWS.SES({ region: process.env.AWS_REGION });
const consumer = kafka.consumer({ groupId: "crm-grp" });

(async () => {
  await consumer.connect();
  await consumer.subscribe({
    topic: "books.topic.events",
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const payload = JSON.parse(message.value.toString());
      const ISBN = payload.ISBN;

      await ses
        .sendEmail({
          Source: "noreply@cmu.edu", // verified sender in SES sandbox
          Destination: { ToAddresses: ["customer@example.com"] },
          Message: {
            Subject: { Data: `Book ${ISBN} updated` },
            Body: {
              Text: { Data: `Book with ISBN ${ISBN} was created/updated.` },
            },
          },
        })
        .promise();

      console.log("Email sent for", ISBN);
    },
  });
})();
