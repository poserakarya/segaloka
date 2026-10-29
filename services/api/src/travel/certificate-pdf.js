import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

function safeText(value) {
  return String(value ?? '-').slice(0, 250);
}

export async function createCertificatePdf(certificate, verificationUrl) {
  const qr = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 300
  });

  const qrImage = Buffer.from(qr.split(',')[1], 'base64');

  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 48,
      info: {
        Title: 'Sertifikat Perjalanan Segaloka',
        Author: 'Segaloka',
        Subject: 'Keterangan Partisipasi Perjalanan'
      }
    });

    const chunks = [];

    document.on('data', chunk => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));

    const width = document.page.width;

    document
      .rect(24, 24, width - 48, document.page.height - 48)
      .lineWidth(2)
      .stroke('#17365D');

    document
      .font('Helvetica-Bold')
      .fontSize(25)
      .fillColor('#17365D')
      .text('SERTIFIKAT PERJALANAN', 65, 80, {
        align: 'center',
        width: width - 130
      });

    document
      .font('Helvetica')
      .fontSize(12)
      .fillColor('#444444')
      .text('Keterangan Partisipasi Perjalanan', 65, 119, {
        align: 'center',
        width: width - 130
      });

    document
      .fontSize(11)
      .text('Diberikan kepada:', 90, 170, {
        align: 'center',
        width: width - 180
      });

    document
      .font('Helvetica-Bold')
      .fontSize(23)
      .fillColor('#17365D')
      .text(safeText(certificate.participantName), 85, 195, {
        align: 'center',
        width: width - 170
      });

    document
      .font('Helvetica')
      .fontSize(12)
      .fillColor('#333333')
      .text(
        'Atas partisipasi dalam perjalanan yang telah diverifikasi oleh Travel penyelenggara.',
        85, 244, {
          align: 'center',
          width: width - 170
        }
      );

    const fields = [
      ['Travel Penyelenggara', certificate.travelName],
      ['Perjalanan', certificate.tripTitle],
      ['Destinasi', certificate.destination],
      ['Tanggal Keberangkatan', certificate.departureDate],
      ['Nomor Sertifikat', certificate.certificateNumber]
    ];

    let y = 290;

    for (const [label, value] of fields) {
      document
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(label, 90, y, { width: 180 });

      document
        .font('Helvetica')
        .text(': ' + safeText(value), 275, y, {
          width: 370
        });

      y += 28;
    }

    document.image(qrImage, width - 170, 365, {
      width: 95,
      height: 95
    });

    document
      .fontSize(8)
      .fillColor('#555555')
      .text('Pindai untuk verifikasi', width - 195, 466, {
        width: 145,
        align: 'center'
      });

    document
      .fontSize(9)
      .text(
        'Bukan bukti resmi pemerintah atau sertifikasi penyelesaian ibadah.',
        80, 505, {
          width: width - 160,
          align: 'center'
        }
      );

    document
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#17365D')
      .text('Powered by Segaloka', 80, 534, {
        width: width - 160,
        align: 'center'
      });

    document.end();
  });
}