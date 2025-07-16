//----------- RESERVATION ----------//
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/reserve', async (req, res) => {
  const { name, email, date, time, partySize, notes } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'napppy.lee@gmail.com',
      pass: 'prjvtfjoffeaqkpu' // App Password
    }
  });

  // 📩 Email to you (admin/test inbox)
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

  // ✅ Confirmation email to the guest
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

//------------ CONTACT ---------//
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'napppy.lee@gmail.com',
      pass: 'prjvtfjoffeaqkpu' // Replace with your Gmail app password
    }
  });

  const mailOptions = {
    from: email,
    to: 'napppy.lee@gmail.com', // ← this is where the contact message is sent
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
