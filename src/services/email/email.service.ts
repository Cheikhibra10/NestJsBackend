// src/email/email.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PdfService } from './pdf.service';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly pdfService: PdfService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async sendUserEmail(userData: { nom: string; prenom: string; telephone: string; adresse: string; email: string }) {
    const pdfBuffer = await this.pdfService.createPdf(userData);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userData.email,
      subject: 'Welcome to Our Service!',
      text: `Hello ${userData.prenom},\n\nWelcome to our service! Here are your details:\n\nName: ${userData.nom} ${userData.prenom}\nTelephone: ${userData.telephone}\nAdresse: ${userData.adresse}`,
      attachments: [
        {
          filename: 'account-details.pdf',
          content: pdfBuffer,
        },
      ],
    };
    try {
        await this.transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
      } catch (error) {
        console.error('Error sending email:', error);
      }
    
  }
}
