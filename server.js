// ───────── IMPORTS ─────────
require('dotenv').config(); // load .env variables
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
//const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Set this in your .env file

// ───────── INIT APP ─────────
const app = express();
const PORT = process.env.PORT || 3000;

// ───────── MIDDLEWARE ─────────
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

// ───────── RESERVATION ROUTE ─────────
app.post('/reserve', async (req, res) => {
  const { name, email, date, time, partySize, notes } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'napppy.lee@gmail.com',
      pass: 'prjvtfjoffeaqkpu' // Gmail App Password
    }
  });

  const mailOptions = {
    from: email,
    to: 'napppy.lee@gmail.com',
    subject: `New Reservation from ${name}`,
    text: `
Name: ${name}
Email: ${email}
Date: ${date}
Time: ${time}
Party Size: ${partySize}
Notes: ${notes || "None"}
    `
  };

  const confirmationMailOptions = {
    from: 'napppy.lee@gmail.com',
    to: email,
    subject: 'AKO Reservation Confirmation',
    text: `
Hi ${name},

Thanks for reserving with AKO by Lee! Here's your reservation info:

📅 Date: ${date}
⏰ Time: ${time}
👥 Guests: ${partySize}
📝 Notes: ${notes || "None"}

We look forward to sharing tea with you!

– AKO by Lee Team
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    await transporter.sendMail(confirmationMailOptions);
    console.log('Reservation sent to admin and confirmation sent to guest.');
    res.status(200).json({ message: 'Reservation submitted and confirmation sent!' });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ message: 'Error sending reservation or confirmation.' });
  }
});

// ───────── CONTACT ROUTE ─────────
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'napppy.lee@gmail.com',
      pass: 'prjvtfjoffeaqkpu'
    }
  });

  const mailOptions = {
    from: email,
    to: 'napppy.lee@gmail.com',
    subject: `New Message from ${name}`,
    text: `
Name: ${name}
Email: ${email}
Message: ${message}
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ message: 'Failed to send message.' });
  }
});

// ───────── STRIPE CHECKOUT ROUTE ─────────
app.post('/create-checkout-session', async (req, res) => {
  const { items } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: item.price, // price already in cents
        },
        quantity: item.quantity,
      })),
      success_url: 'http://localhost:3000/success.html',
      cancel_url: 'http://localhost:3000/cancel.html',

    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Unable to create checkout session' });
  }
});

// ───────── START SERVER ─────────
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
