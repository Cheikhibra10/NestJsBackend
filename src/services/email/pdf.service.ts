import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit'); // CommonJS import
import { PassThrough } from 'stream';
import axios from 'axios'; // Import axios for downloading the image

@Injectable()
export class PdfService {
  async createPdf(userData: { nom: string; prenom: string; telephone: string; adresse: string; email: string; photo?: string }) {
    return new Promise<Buffer>(async (resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = new PassThrough();
      const chunks: Buffer[] = [];

      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err) => reject(err));

      doc.pipe(stream);

      // Define card dimensions and background
      const cardWidth = 500;
      const cardHeight = 300;
      const cardX = (doc.page.width - cardWidth) / 2;
      const cardY = 100;

      // Draw card background and border
      doc.rect(cardX, cardY, cardWidth, cardHeight).fill('#f5f5f5').stroke('#CCCCCC');

      // Add title
      doc.fontSize(18).fillColor('#333333').text("Information de l'utilisateur", cardX, cardY + 20, {
        align: 'center',
        width: cardWidth,
      });

      // Add user information
      const padding = 20;
      let currentY = cardY + 60;

      doc.fontSize(12).fillColor('#333333');
      doc.text(`Nom:`, cardX + padding, currentY);
      doc.font('Helvetica-Bold').text(`${userData.nom}`, cardX + padding + 60, currentY);
      doc.font('Helvetica').text(`Prénom:`, cardX + padding, currentY += 20);
      doc.font('Helvetica-Bold').text(`${userData.prenom}`, cardX + padding + 60, currentY);
      doc.font('Helvetica').text(`Téléphone:`, cardX + padding, currentY += 20);
      doc.font('Helvetica-Bold').text(`${userData.telephone}`, cardX + padding + 60, currentY);
      doc.font('Helvetica').text(`Adresse:`, cardX + padding, currentY += 20);
      doc.font('Helvetica-Bold').text(`${userData.adresse}`, cardX + padding + 60, currentY);
      doc.font('Helvetica').text(`Email:`, cardX + padding, currentY += 20);
      doc.font('Helvetica-Bold').text(`${userData.email}`, cardX + padding + 60, currentY);

      // If photo exists, download and add it to the PDF
      if (userData.photo) {
        try {
          const response = await axios.get(userData.photo, { responseType: 'arraybuffer' });
          const imageBuffer = Buffer.from(response.data, 'binary');
      
          // Coordinates for the image
          const imageX = cardX + cardWidth - 120;
          const imageY = cardY + 60;
          const imageSize = 100; // Image size (width and height, because it's a square)
      
          // Create a circular clipping path
          doc.save(); // Save the current graphics state
          doc.circle(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2).clip(); // Create the circular clipping path
      
          // Add the downloaded image inside the clipped region
          doc.image(imageBuffer, imageX, imageY, {
            width: imageSize,
            height: imageSize,
          });
      
          doc.restore(); // Restore the graphics state (so the circle clipping applies only to the image)
        } catch (error) {
          console.error('Error downloading image:', error);
        }
      }
      
      // Optional: Add footer text
      doc.fontSize(10).fillColor('#777777').text('Copyright@2024', cardX, cardY + cardHeight - 30, {
        align: 'center',
        width: cardWidth,
      });

      doc.end(); // Finalize the PDF
    });
  }
}
