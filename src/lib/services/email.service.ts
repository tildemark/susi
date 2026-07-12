import nodemailer from 'nodemailer';

export const emailService = {
  async sendBillEmail(to: string, tenantName: string, billMonth: number, billYear: number, pdfUrl: string, pdfContent: string) {
    console.log(`[EmailService] Preparing billing email to ${to} for period ${billMonth}/${billYear}...`);
    
    // We can configure a transporter using Nodemailer
    // Since this runs in local dev environment without actual SMTP credentials,
    // we will log the email details clearly to stdout/task logs and create a mock transport.
    // If SMTP env vars are available, we can send a real email, otherwise mock it.
    const transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'windows',
      buffer: true
    });

    try {
      const info = await transporter.sendMail({
        from: '"SUSI Billing System" <billing@susi.internal>',
        to,
        subject: `SUSI Billing Statement - ${new Date(billYear, billMonth - 1).toLocaleString('en-US', { month: 'long' })} ${billYear}`,
        text: `Hello ${tenantName},\n\nPlease find your billing statement for ${new Date(billYear, billMonth - 1).toLocaleString('en-US', { month: 'long' })} ${billYear} attached.\n\nThank you,\nSUSI Management`,
        attachments: [
          {
            filename: `bill-${billMonth}-${billYear}.txt`,
            content: pdfContent,
            contentType: 'text/plain',
          }
        ]
      });

      console.log(`[EmailService] Mock email successfully generated for ${to}.`);
      console.log(`[EmailService] Message details: Subject: "${info.envelope.to}", Attachment size: ${pdfContent.length} bytes`);
      return info;
    } catch (err) {
      console.error('[EmailService] Failed to generate/send mock email:', err);
      throw err;
    }
  }
};
