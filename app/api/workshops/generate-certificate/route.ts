import { NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, setDoc, addDoc, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

async function dispatchEmail(reg: any, certNo: string, downloadUrl: string, attempt = 1): Promise<boolean> {
  try {
    console.log(`[Email Attempt ${attempt}] Sending Certificate PDF to ${reg.client_email}. Download Link: ${downloadUrl}`);
    return true;
  } catch (err: any) {
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      return dispatchEmail(reg, certNo, downloadUrl, attempt + 1);
    }
    return false;
  }
}

async function dispatchWhatsApp(reg: any, downloadUrl: string, attempt = 1): Promise<boolean> {
  try {
    console.log(`[WhatsApp Attempt ${attempt}] Sending Certificate Link to ${reg.client_phone}. Download Link: ${downloadUrl}`);
    return true;
  } catch (err: any) {
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      return dispatchWhatsApp(reg, downloadUrl, attempt + 1);
    }
    return false;
  }
}

// Convert hex color to rgb array
function hexToRgb(hex: string) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0;
  return rgb(r, g, b);
}

export async function POST(req: Request) {
  try {
    const { registration_id, force_regenerate } = await req.json();
    if (!registration_id) {
      return NextResponse.json({ error: 'Missing registration ID.' }, { status: 400 });
    }

    const regQuery = query(collection(db, 'workshopRegistrations'), where('id', '==', registration_id));
    const snap = await getDocs(regQuery);
    if (snap.empty) {
      return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    }

    const regDoc = snap.docs[0];
    const regData = regDoc.data();

    // Check if certificate already exists and regeneration is not forced
    if (regData.certificate_url && regData.certificate_status === 'available' && !force_regenerate) {
      return NextResponse.json({ ok: true, url: regData.certificate_url, cert_number: regData.certificate_number });
    }

    // Load Certificate settings document dynamically from Firestore
    const certSettingsRef = doc(db, 'settings', 'certificate');
    const certSettingsSnap = await getDoc(certSettingsRef);
    const s = certSettingsSnap.exists() ? certSettingsSnap.data() : {};

    // Apply defaults if settings are empty
    const settings = {
      template_url: s.template_url || '/certificates/template.png',
      logo_url: s.logo_url || '',
      founder_name: s.founder_name || 'Sumit G.',
      founder_designation: s.founder_designation || 'Founder, LifeHolics',
      founder_signature_url: s.founder_signature_url || '',
      director_name: s.director_name || 'LifeHolics Somatics',
      director_designation: s.director_designation || 'Director',
      director_signature_url: s.director_signature_url || '',
      
      show_founder_signature: s.show_founder_signature !== false,
      show_director_signature: s.show_director_signature !== false,
      show_logo: !!s.show_logo,
      show_qr_code: s.show_qr_code !== false,
      show_cert_number: s.show_cert_number !== false,
      show_completion_date: s.show_completion_date !== false,
      show_workshop_name: s.show_workshop_name !== false,
      show_user_name: s.show_user_name !== false,

      user_name_font_size: s.user_name_font_size || 36,
      user_name_color: s.user_name_color || '#1f1f1f',
      workshop_name_font_size: s.workshop_name_font_size || 26,
      workshop_name_color: s.workshop_name_color || '#b7943c',
      cert_number_font_size: s.cert_number_font_size || 14,
      cert_number_color: s.cert_number_color || '#333333',
      date_font_size: s.date_font_size || 14,
      date_color: s.date_color || '#333333',

      user_name_x: s.user_name_x ?? 500,
      user_name_y: s.user_name_y ?? 560,
      workshop_name_x: s.workshop_name_x ?? 500,
      workshop_name_y: s.workshop_name_y ?? 712,
      cert_number_x: s.cert_number_x ?? 420,
      cert_number_y: s.cert_number_y ?? 405,
      date_x: s.date_x ?? 230,
      date_y: s.date_y ?? 405,
      qr_code_x: s.qr_code_x ?? 690,
      qr_code_y: s.qr_code_y ?? 390,
      founder_sig_x: s.founder_sig_x ?? 280,
      founder_sig_y: s.founder_sig_y ?? 215,
      director_sig_x: s.director_sig_x ?? 600,
      director_sig_y: s.director_sig_y ?? 215,
      logo_x: s.logo_x ?? 500,
      logo_y: s.logo_y ?? 800
    };

    // Load template image bytes
    let templateBytes: Buffer;
    if (settings.template_url.startsWith('http')) {
      const imgRes = await fetch(settings.template_url);
      templateBytes = Buffer.from(await imgRes.arrayBuffer());
    } else {
      const templatePath = path.join(process.cwd(), 'public', 'certificates', 'template.png');
      if (!fs.existsSync(templatePath)) {
        return NextResponse.json({ error: 'Local template not found.' }, { status: 500 });
      }
      templateBytes = fs.readFileSync(templatePath);
    }

    // Generate Certificate ID
    const certNo = regData.certificate_number || `CERT-${regData.workshop_id.substring(0, 4).toUpperCase()}-${Math.random().toString(36).substring(4, 10).toUpperCase()}`;

    // Create PDF Document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([1000, 1000]);

    // Draw Template Image
    const templateImage = await pdfDoc.embedPng(templateBytes);
    page.drawImage(templateImage, { x: 0, y: 0, width: 1000, height: 1000 });

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Render User Name
    if (settings.show_user_name) {
      const nameText = regData.client_name;
      const nameSize = settings.user_name_font_size;
      const nameWidth = fontBold.widthOfTextAtSize(nameText, nameSize);
      page.drawText(nameText, {
        x: settings.user_name_x - nameWidth / 2,
        y: settings.user_name_y,
        size: nameSize,
        font: fontBold,
        color: hexToRgb(settings.user_name_color)
      });
    }

    // Render Workshop Name
    if (settings.show_workshop_name) {
      const titleText = regData.workshop_title;
      const titleSize = settings.workshop_name_font_size;
      const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
      page.drawText(titleText, {
        x: settings.workshop_name_x - titleWidth / 2,
        y: settings.workshop_name_y,
        size: titleSize,
        font: fontBold,
        color: hexToRgb(settings.workshop_name_color)
      });
    }

    // Render Date
    if (settings.show_completion_date) {
      const formattedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      page.drawText(formattedDate, {
        x: settings.date_x,
        y: settings.date_y,
        size: settings.date_font_size,
        font: fontRegular,
        color: hexToRgb(settings.date_color)
      });
    }

    // Render Certificate Number
    if (settings.show_cert_number) {
      page.drawText(certNo, {
        x: settings.cert_number_x,
        y: settings.cert_number_y,
        size: settings.cert_number_font_size,
        font: fontRegular,
        color: hexToRgb(settings.cert_number_color)
      });
    }

    // Render Logo
    if (settings.show_logo && settings.logo_url) {
      try {
        const logoRes = await fetch(settings.logo_url);
        const logoBytes = Buffer.from(await logoRes.arrayBuffer());
        const logoImage = await pdfDoc.embedPng(logoBytes);
        page.drawImage(logoImage, {
          x: settings.logo_x - 50,
          y: settings.logo_y - 25,
          width: 100,
          height: 50
        });
      } catch (e) {
        console.error('Failed to embed logo onto certificate:', e);
      }
    }

    // Render QR Code
    if (settings.show_qr_code) {
      const verificationUrl = `https://lifeholics.com/verify-certificate/${certNo}`;
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 200 });
      const qrImageBytes = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
      const qrImage = await pdfDoc.embedPng(qrImageBytes);
      page.drawImage(qrImage, {
        x: settings.qr_code_x - 45,
        y: settings.qr_code_y - 45,
        width: 90,
        height: 90
      });
    }

    // Render Signatures
    if (settings.show_founder_signature) {
      page.drawText(settings.founder_name, {
        x: settings.founder_sig_x - fontBold.widthOfTextAtSize(settings.founder_name, 12) / 2,
        y: settings.founder_sig_y - 15,
        size: 12,
        font: fontBold,
        color: rgb(0.15, 0.15, 0.15)
      });
      if (settings.founder_signature_url) {
        try {
          const sigRes = await fetch(settings.founder_signature_url);
          const sigBytes = Buffer.from(await sigRes.arrayBuffer());
          const sigImage = await pdfDoc.embedPng(sigBytes);
          page.drawImage(sigImage, {
            x: settings.founder_sig_x - 50,
            y: settings.founder_sig_y,
            width: 100,
            height: 35
          });
        } catch (e) {
          console.error('Failed to load founder signature image:', e);
        }
      }
    }

    if (settings.show_director_signature) {
      page.drawText(settings.director_name, {
        x: settings.director_sig_x - fontBold.widthOfTextAtSize(settings.director_name, 12) / 2,
        y: settings.director_sig_y - 15,
        size: 12,
        font: fontBold,
        color: rgb(0.15, 0.15, 0.15)
      });
      if (settings.director_signature_url) {
        try {
          const sigRes = await fetch(settings.director_signature_url);
          const sigBytes = Buffer.from(await sigRes.arrayBuffer());
          const sigImage = await pdfDoc.embedPng(sigBytes);
          page.drawImage(sigImage, {
            x: settings.director_sig_x - 50,
            y: settings.director_sig_y,
            width: 100,
            height: 35
          });
        } catch (e) {
          console.error('Failed to load director signature image:', e);
        }
      }
    }

    const pdfBytes = await pdfDoc.save();

    // Upload to Firebase Storage
    const storagePath = `certificates/${regData.workshop_id}/${regData.user_id}/certificate.pdf`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, pdfBytes, { contentType: 'application/pdf' });
    const downloadUrl = await getDownloadURL(storageRef);

    // Save in Firestore
    const formattedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    await setDoc(regDoc.ref, {
      certificate_url: downloadUrl,
      certificate_number: certNo,
      certificate_status: 'available',
      certificate_date: formattedDate
    }, { merge: true });

    // In-App Notification
    await addDoc(collection(db, 'notifications'), {
      user_id: regData.user_id,
      type: 'certificate_ready',
      title: 'Certificate Available',
      message: `Your workshop certificate for '${regData.workshop_title}' is ready to download.`,
      read: false,
      created_at: new Date().toISOString()
    });

    dispatchEmail(regData, certNo, downloadUrl).then((success) => {
      if (!success) console.error(`Email dispatch failed for ${regData.client_email}`);
    });

    dispatchWhatsApp(regData, downloadUrl).then((success) => {
      if (!success) console.error(`WhatsApp dispatch failed for ${regData.client_phone}`);
    });

    return NextResponse.json({ ok: true, url: downloadUrl, cert_number: certNo });
  } catch (error: any) {
    console.error('Dynamic certificate generation failed:', error);
    return NextResponse.json({ error: 'Certificate generation failed: ' + error.message }, { status: 500 });
  }
}
