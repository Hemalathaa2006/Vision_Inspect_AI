import { jsPDF } from "jspdf";
import { InspectionResult } from "../types";

export function generateSafetyPDF(
  result: InspectionResult,
  imageBase64: string,
  fileName: string = "safety-inspection-report.pdf"
) {
  // Create a portrait A4 document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~297mm
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // ~180mm

  // 1. Header Band
  doc.setFillColor(15, 23, 42); // slate-900 background
  doc.rect(0, 0, pageWidth, 40, "F");

  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("VisionInspect AI", margin, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(191, 219, 254); // Light blue text
  doc.text("AI Workplace Safety Inspection Report", margin, 21);

  // Date and Time
  const dateStr = new Date().toLocaleString();
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text(`Generated on: ${dateStr}`, margin, 32);

  // Safety Score Box in Header
  doc.setFillColor(59, 130, 246); // blue background
  doc.roundedRect(pageWidth - margin - 50, 8, 50, 24, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("SAFETY SCORE", pageWidth - margin - 40, 14);

  doc.setFontSize(18);
  doc.text(`${result.safetyScore}%`, pageWidth - margin - 35, 22);

  doc.setFontSize(8);
  doc.text(`Grade ${result.grade} (${result.status})`, pageWidth - margin - 42, 28);

  // 2. Scene Summary Section
  let currentY = 50;
  doc.setFillColor(241, 245, 249); // slate-100 bg
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, "F");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SCENE SUMMARY", margin + 5, currentY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  const splitSummary = doc.splitTextToSize(result.sceneSummary, contentWidth - 10);
  doc.text(splitSummary, margin + 5, currentY + 12);

  currentY += 32;

  // 3. Middle Section: Image and Good Practices (Grid layout)
  const leftColX = margin;
  const colWidth = contentWidth / 2 - 3;
  const rightColX = margin + colWidth + 6;

  // Draw Good Practices Card on the Left
  doc.setFillColor(248, 250, 252); // light slate bg
  doc.roundedRect(leftColX, currentY, colWidth, 70, 2, 2, "F");
  
  doc.setTextColor(22, 163, 74); // Green 600
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("GOOD SAFETY PRACTICES", leftColX + 5, currentY + 6);

  let practiceY = currentY + 12;
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  if (result.goodPractices.length === 0) {
    doc.text("No specific good practices highlighted.", leftColX + 5, practiceY);
  } else {
    result.goodPractices.slice(0, 3).forEach((gp) => {
      doc.setFont("helvetica", "bold");
      doc.text(`* ${gp.title}`, leftColX + 5, practiceY);
      doc.setFont("helvetica", "normal");
      practiceY += 4.5;
      gp.items.slice(0, 3).forEach((item) => {
        doc.text(`  - ${item}`, leftColX + 8, practiceY);
        practiceY += 4;
      });
      practiceY += 1.5;
    });
  }

  // Draw Uploaded Image on the Right
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightColX, currentY, colWidth, 70, 2, 2, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text("INSPECTED VISUAL SCENE", rightColX + 5, currentY + 6);

  try {
    doc.addImage(imageBase64, "JPEG", rightColX + 5, currentY + 10, colWidth - 10, 53, undefined, "FAST");
  } catch (err) {
    doc.setDrawColor(203, 213, 225);
    doc.rect(rightColX + 5, currentY + 10, colWidth - 10, 53);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("[Visual Image Attachment]", rightColX + 15, currentY + 35);
  }

  currentY += 78;

  // 4. Detected Hazards Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("DETECTED SAFETY HAZARDS", margin, currentY);
  currentY += 4;

  if (result.detectedHazards.length === 0) {
    doc.setFillColor(240, 253, 244); // light green bg
    doc.roundedRect(margin, currentY, contentWidth, 15, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(10);
    doc.text("No safety hazards detected. Maintain high safety standards!", margin + 5, currentY + 9);
  } else {
    result.detectedHazards.slice(0, 3).forEach((hazard) => {
      // Background for hazard card
      doc.setFillColor(254, 242, 242); // light red bg
      doc.roundedRect(margin, currentY, contentWidth, 32, 2, 2, "F");

      // Draw red severity indicator bar
      doc.setFillColor(239, 68, 68); // Red
      doc.rect(margin, currentY, 2, 32, "F");

      // Title & Severity badge
      doc.setTextColor(185, 28, 28); // Red 700
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`${hazard.title}`, margin + 5, currentY + 6);

      // Severity tag
      doc.setFillColor(254, 226, 226);
      doc.roundedRect(pageWidth - margin - 35, currentY + 2, 30, 5, 1, 1, "F");
      doc.setTextColor(185, 28, 28);
      doc.setFontSize(7.5);
      doc.text(`SEVERITY: ${hazard.severity.toUpperCase()}`, pageWidth - margin - 33, currentY + 5.5);

      // Issue text
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("Issue: ", margin + 5, currentY + 12);
      doc.setFont("helvetica", "normal");
      doc.text(hazard.issue, margin + 16, currentY + 12);

      // Why it matters
      doc.setFont("helvetica", "bold");
      doc.text("Impact: ", margin + 5, currentY + 17);
      doc.setFont("helvetica", "normal");
      doc.text(hazard.whyItMatters, margin + 18, currentY + 17);

      // Recommendations
      doc.setFont("helvetica", "bold");
      doc.text("Actions:", margin + 5, currentY + 22);
      doc.setFont("helvetica", "normal");
      const recs = hazard.recommendations.slice(0, 2).join(" | ");
      doc.text(recs, margin + 18, currentY + 22);

      currentY += 36;
    });
  }

  // 5. Footer disclaimer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const disclaimerText = "Disclaimer: This is an AI-powered visual inspection assistant. It is a decision support tool and does not replace a physical certified safety audit.";
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, contentWidth);
  doc.text(splitDisclaimer, margin, 283);

  // Logo tag at bottom right
  doc.setFont("helvetica", "bold");
  doc.text("Generated by VisionInspect AI", pageWidth - margin - 40, 290);

  doc.save(fileName);
}
