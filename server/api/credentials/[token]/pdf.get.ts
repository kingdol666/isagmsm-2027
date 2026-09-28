import QRCode from 'qrcode'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { getCredentialView } from '../../../services/credential.service'

/**
 * Printable PDF credential (server-generated via pdf-lib): event, participant,
 * type, registration id, QR of the verification URL, and status.
 */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token || token.length < 20) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid credential token' })
  }
  const db = useDb()
  const view = await getCredentialView(db, token)
  if (!view) throw createError({ statusCode: 404, statusMessage: 'Credential not found' })

  const config = useRuntimeConfig(event)
  const verifyUrl = new URL(`/verify/${token}`, config.public.siteUrl).toString()

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842]) // A4 portrait
  const { width } = page.getSize()

  const ink = rgb(0.067, 0.067, 0.067)
  const paper = rgb(0.969, 0.965, 0.949)
  const grey = rgb(0.42, 0.42, 0.4)
  const copper = rgb(0.706, 0.373, 0.227)

  page.drawRectangle({ x: 0, y: 0, width, height: 842, color: paper })

  const serif = await pdf.embedFont(StandardFonts.TimesRoman)
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic)
  const sans = await pdf.embedFont(StandardFonts.Helvetica)
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const mono = await pdf.embedFont(StandardFonts.Courier)

  const text = (value: string, x: number, y: number, size: number, font = sans, color = ink) =>
    page.drawText(value, { x, y, size, font, color })

  /* header */
  text('PPS 2026', 48, 780, 34, serif)
  text('POLYMER PROCESSING SYMPOSIUM', 48, 762, 10, sansBold, grey)
  text('15—17 OCTOBER 2026 · HEFEI · CHINA', 48, 748, 9, mono, grey)

  /* the melt line */
  page.drawLine({
    start: { x: 48, y: 726 },
    end: { x: width - 48, y: 726 },
    thickness: 1,
    color: copper,
  })
  text('REGISTRATION CONFIRMED', 48, 706, 10, sansBold, copper)

  /* participant */
  text('PARTICIPANT', 48, 654, 9, sansBold, grey)
  text(view.registration.fullName, 48, 630, 26, serif)
  text('AFFILIATION', 48, 594, 9, sansBold, grey)
  text(view.registration.affiliation, 48, 576, 12, sans)

  /* facts */
  text('REGISTRATION TYPE', 48, 534, 9, sansBold, grey)
  text(view.type.name, 48, 516, 12, sans)
  text('REGISTRATION ID', 48, 474, 9, sansBold, grey)
  text(view.registration.displayId, 48, 454, 14, mono)

  /* QR */
  const qrPng = await QRCode.toBuffer(verifyUrl, { type: 'png', margin: 1, width: 480 })
  const qrImage = await pdf.embedPng(qrPng)
  const qrSize = 190
  const qrX = width - qrSize - 48
  page.drawImage(qrImage, { x: qrX, y: 500, width: qrSize, height: qrSize })
  page.drawRectangle({
    x: qrX - 1,
    y: 499,
    width: qrSize + 2,
    height: qrSize + 2,
    borderColor: ink,
    borderWidth: 1,
  })
  text('SCAN TO VERIFY', qrX, 486, 9, sansBold, grey)

  /* verification footer */
  page.drawLine({
    start: { x: 48, y: 430 },
    end: { x: width - 48, y: 430 },
    thickness: 0.5,
    color: grey,
  })
  text('VERIFICATION URL', 48, 406, 9, sansBold, grey)
  const urlLines = splitUrl(verifyUrl, 90)
  urlLines.forEach((line, index) => {
    text(line, 48, 390 - index * 14, 9, mono)
  })

  text('Status:', 48, 330, 10, sansBold, grey)
  text(
    view.status === 'active' ? 'VALID' : 'REVOKED',
    96,
    330,
    10,
    sansBold,
    view.status === 'active' ? ink : copper,
  )
  text(
    view.checkedInAt ? 'CHECKED IN' : 'NOT CHECKED IN',
    180,
    330,
    10,
    sans,
    grey,
  )

  text('Issued by the PPS 2026 Organising Committee (sample credential)', 48, 300, 8, serifItalic, grey)
  text('This pass is personal and non-transferable. Please present the QR code at check-in.', 48, 288, 8, serifItalic, grey)

  /* strata footer: five film layers, one copper */
  for (let i = 0; i < 5; i++) {
    page.drawLine({
      start: { x: 48, y: 96 - i * 6 },
      end: { x: 268, y: 96 - i * 6 },
      thickness: 1,
      color: i === 2 ? copper : rgb(0.067, 0.067, 0.067),
      opacity: i === 2 ? 1 : 0.22,
    })
  }
  text('© 2026 PPS 2026 ORGANISING COMMITTEE', 48, 64, 8, mono, grey)

  const bytes = await pdf.save()
  setHeader(event, 'content-type', 'application/pdf')
  setHeader(event, 'content-disposition', `attachment; filename="PPS2026-${view.registration.displayId}.pdf"`)
  return bytes
})

function splitUrl(url: string, maxChars: number): string[] {
  const lines: string[] = []
  for (let i = 0; i < url.length; i += maxChars) {
    lines.push(url.slice(i, i + maxChars))
  }
  return lines
}
