const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();
const adminEmail=process.env.AdminEmail;

require('dotenv').config();

// Email configuration - replace with your actual email service settings
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your preferred email service
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS  // Your email password or app-specific password
  }
});

// Alternative configuration for other email services:
// const transporter = nodemailer.createTransporter({
//   host: 'smtp.your-email-provider.com',
//   port: 587,
//   secure: false,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS
//   }
// });

// Generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Format date for email
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Send verification email to user
const sendVerificationEmail = async (consultation) => {
  console.log(process.env.FRONTEND_URL);
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-consultation/${consultation.verificationToken}`;
  const cancelUrl = `${process.env.FRONTEND_URL}/cancel-consultation/${consultation.verificationToken}`;
  
  const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Consultation Booking</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #2563eb;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f8fafc;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .info-section {
          background-color: white;
          padding: 20px;
          margin: 15px 0;
          border-radius: 6px;
          border-left: 4px solid #2563eb;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .btn {
          display: inline-block;
          padding: 12px 30px;
          margin: 10px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          font-size: 16px;
        }
        .btn-verify {
          background-color: #16a34a;
          color: white;
        }
        .btn-cancel {
          background-color: #dc2626;
          color: white;
        }
        .btn:hover {
          opacity: 0.9;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 14px;
          color: #666;
        }
        .warning {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 15px 0;
          border-radius: 6px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Verify Your Consultation Booking</h1>
        <p>Please confirm your home consultation appointment</p>
      </div>
      
      <div class="content">
        <p>Dear ${consultation.user.name},</p>
        
        <p>Thank you for booking a home consultation with us. Please review the details below and verify your appointment:</p>
        
        <div class="info-section">
          <h3>👤 User Details</h3>
          <p><strong>Name:</strong> ${consultation.user.name}</p>
          <p><strong>Email:</strong> ${consultation.user.email}</p>
          <p><strong>Phone:</strong> ${consultation.user.phone}</p>
        </div>
        
        <div class="info-section">
          <h3>🏥 Patient Details</h3>
          <p><strong>Patient Name:</strong> ${consultation.patient.name}</p>
          <p><strong>Age:</strong> ${consultation.patient.age} years</p>
          <p><strong>Gender:</strong> ${consultation.patient.gender}</p>
          <p><strong>Reason for Consultation:</strong> ${consultation.patient.reason}</p>
        </div>
        
        <div class="info-section">
          <h3>📅 Appointment Details</h3>
          <p><strong>Date:</strong> ${formatDate(consultation.slot.date)}</p>
          <p><strong>Time:</strong> ${consultation.slot.time}</p>
          <p><strong>Location:</strong> <a href="${consultation.location.link}" target="_blank">View on Google Maps</a></p>
        </div>
        
        <div class="warning">
          <strong>⏰ Important:</strong> This verification link will expire in 24 hours. Please verify your appointment soon to confirm your booking.
        </div>
        
        <div class="button-container">
          <a href="${verificationUrl}" class="btn btn-verify">✓ VERIFY APPOINTMENT</a>
          <a href="${cancelUrl}" class="btn btn-cancel">✗ CANCEL APPOINTMENT</a>
        </div>
        
        <p>If you have any questions or need to make changes to your appointment, please contact our support team.</p>
        
        <div class="footer">
          <p>This email was sent to ${consultation.user.email}</p>
          <p>If you didn't request this consultation, please ignore this email.</p>
          <p>&copy; 2024 Healthcare Services. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: consultation.user.email,
    subject: 'Verify Your Home Consultation Booking - Action Required',
    html: emailHtml
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully to:', consultation.user.email);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

// Send confirmation email to user and admin after verification
const sendConfirmationEmails = async (consultation) => {
  const userEmailHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Consultation Confirmed</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #16a34a;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f8fafc;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .info-section {
          background-color: white;
          padding: 20px;
          margin: 15px 0;
          border-radius: 6px;
          border-left: 4px solid #16a34a;
        }
        .success-banner {
          background-color: #dcfce7;
          border: 2px solid #16a34a;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
          text-align: center;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 14px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>✅ Consultation Confirmed!</h1>
        <p>Your appointment has been successfully verified</p>
      </div>
      
      <div class="content">
        <p>Dear ${consultation.user.name},</p>
        
        <div class="success-banner">
          <h2>🎉 Great News!</h2>
          <p>Your home consultation has been confirmed. Our healthcare professional will visit you at the scheduled time.</p>
        </div>
        
        <div class="info-section">
          <h3>📋 Appointment Summary</h3>
          <p><strong>Patient:</strong> ${consultation.patient.name}</p>
          <p><strong>Date:</strong> ${formatDate(consultation.slot.date)}</p>
          <p><strong>Time:</strong> ${consultation.slot.time}</p>
          <p><strong>Location:</strong> <a href="${consultation.location.link}" target="_blank">View on Google Maps</a></p>
          <p><strong>Reason:</strong> ${consultation.patient.reason}</p>
        </div>
        
        <div class="info-section">
          <h3>📞 Next Steps</h3>
          <ul>
            <li>Keep your medical records ready</li>
            <li>Ensure someone is available at the scheduled time</li>
            <li>Our healthcare professional will contact you before arrival</li>
            <li>If you need to reschedule, please contact us at least 24 hours in advance</li>
          </ul>
        </div>
        
        <p>Thank you for choosing our healthcare services. We look forward to providing you with excellent care.</p>
        
        <div class="footer">
          <p>Confirmed on: ${new Date().toLocaleDateString()}</p>
          <p>&copy; 2024 Healthcare Services. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const adminEmailHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Verified Consultation</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #1e40af;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f8fafc;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .info-section {
          background-color: white;
          padding: 20px;
          margin: 15px 0;
          border-radius: 6px;
          border-left: 4px solid #1e40af;
        }
        .urgent {
          background-color: #fee2e2;
          border-left: 4px solid #dc2626;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏥 New Verified Consultation</h1>
        <p>Admin Notification</p>
      </div>
      
      <div class="content">
        <p>Hello Admin,</p>
        
        <p>A new consultation has been verified and confirmed. Please arrange for the healthcare professional assignment.</p>
        
        <div class="info-section urgent">
          <h3>📋 Consultation Details</h3>
          <p><strong>Consultation ID:</strong> ${consultation._id}</p>
          <p><strong>User Name:</strong> ${consultation.user.name}</p>
          <p><strong>User Email:</strong> ${consultation.user.email}</p>
          <p><strong>User Phone:</strong> ${consultation.user.phone}</p>
        </div>
        
        <div class="info-section">
          <h3>👤 Patient Information</h3>
          <p><strong>Patient Name:</strong> ${consultation.patient.name}</p>
          <p><strong>Age:</strong> ${consultation.patient.age} years</p>
          <p><strong>Gender:</strong> ${consultation.patient.gender}</p>
          <p><strong>Medical Reason:</strong> ${consultation.patient.reason}</p>
        </div>
        
        <div class="info-section">
          <h3>📅 Schedule & Location</h3>
          <p><strong>Date:</strong> ${formatDate(consultation.slot.date)}</p>
          <p><strong>Time:</strong> ${consultation.slot.time}</p>
          <p><strong>Location:</strong> <a href="${consultation.location.link}" target="_blank">View on Google Maps</a></p>
          <p><strong>Coordinates:</strong> ${consultation.location.lat}, ${consultation.location.lng}</p>
        </div>
        
        <div class="info-section">
          <h3>📄 Additional Information</h3>
          <p><strong>Medical Records:</strong> File uploaded and stored</p>
          <p><strong>Verified At:</strong> ${new Date(consultation.verifiedAt).toLocaleString()}</p>
          <p><strong>Status:</strong> ${consultation.status}</p>
        </div>
        
        <p><strong>Action Required:</strong> Please assign a healthcare professional and update the consultation status accordingly.</p>
      </div>
    </body>
    </html>
  `;

  // Send confirmation email to user
  const userMailOptions = {
    from: process.env.EMAIL_USER,
    to: consultation.user.email,
    subject: '✅ Your Home Consultation is Confirmed!',
    html: userEmailHtml
  };

  // Send notification email to admin
  const adminMailOptions = {
    from: process.env.EMAIL_USER,
    to: `${adminEmail}`,
    subject: `🏥 New Verified Consultation - ${consultation.patient.name} (${formatDate(consultation.slot.date)})`,
    html: adminEmailHtml
  };

  try {
    // Send both emails
    await Promise.all([
      transporter.sendMail(userMailOptions),
      transporter.sendMail(adminMailOptions)
    ]);
    console.log('Confirmation emails sent successfully');
  } catch (error) {
    console.error('Error sending confirmation emails:', error);
    throw new Error('Failed to send confirmation emails');
  }
};

module.exports = {
  generateVerificationToken,
  sendVerificationEmail,
  sendConfirmationEmails
};