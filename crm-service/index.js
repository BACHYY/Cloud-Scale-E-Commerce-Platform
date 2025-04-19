const { Kafka } = require("kafkajs");
const nodemailer = require("nodemailer");

// Kafka consumer setup
const kafka = new Kafka({
  clientId: "crm-svc",
  brokers: (process.env.KAFKA_BROKERS || "").split(","),
  ssl: false, // set true if using 9094 TLS
});

const consumer = kafka.consumer({ groupId: "crm-grp" });

// SMTP transporter (Gmail example)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // "smtp.gmail.com"
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER, // you@gmail.com
    pass: process.env.SMTP_PASS, // app‑password
  },
});

(async () => {
  await consumer.connect();
  await consumer.subscribe({
    topic: "ahmedc.customer.evt",
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const customer = JSON.parse(message.value.toString());
      const toName = customer.name || customer.fullName || "Customer";
      const toEmail = customer.email;

      const mail = {
        from: '"Book Store" <noreply@example.com>',
        to: toEmail,
        subject: "Activate your book store account",
        text: `Dear ${toName},
Welcome to the Book store created by ahmedc.
Exceptionally this time we won’t ask you to click a link to activate your account.`,
      };

      await transporter.sendMail(mail);
      console.log("Email sent to", toEmail);
    },
  });
})();
