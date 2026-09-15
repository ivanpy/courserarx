import { ProposalResult } from '../types';
import writeXlsxFile, { type Sheet, type Row } from 'write-excel-file/browser';
import { horasPorHito, contarTareas } from '../lib/domain/horas';
import { rolesUnicos } from '../lib/domain/roles';
import { proyectoSlug } from '../lib/domain/slug';

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export function svgToPngBase64(svgString: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 800;
      canvas.height = img.height || 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject(new Error('No 2d context'));
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const pngBase64 = canvas.toDataURL('image/png');
      resolve(pngBase64);
    };

    img.onerror = err => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

export function downloadJsonFile(data: any, filename = 'propuesta_backlog.json') {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateMarkdownExport(proposal: ProposalResult): string {
  let md = `# Propuesta Técnica y Backlog: ${proposal.metadata?.proyecto || 'Proyecto'}\n\n`;
  md += `**Horas Totales Validadas:** ${proposal.horas_totales_validadas} hs\n`;
  md += `**Fecha:** ${new Date().toLocaleDateString()}\n\n`;

  md += `## 1. Resumen Ejecutivo\n${proposal.resumen_ejecutivo}\n\n`;

  md += `## 2. Backlog Técnico por Hitos\n\n`;
  proposal.hitos?.forEach((hito, hIdx) => {
    md += `### ${hito.nombre_meta}\n\n`;
    md += `| Tarea | Descripción | Rol | Horas |\n`;
    md += `| :--- | :--- | :--- | :---: |\n`;
    hito.tareas?.forEach(t => {
      md += `| ${t.titulo} | ${t.descripcion} | \`${t.rol}\` | **${t.horas}h** |\n`;
    });
    md += `\n`;
  });

  if (proposal.alertas_conflictos && proposal.alertas_conflictos.length > 0) {
    md += `## 3. Alertas de Conflictos (Imágenes vs Notas)\n\n`;
    proposal.alertas_conflictos.forEach((c: any) => {
      if (typeof c === 'string') {
        md += `- ${c}\n`;
      } else {
        md += `### ⚠️ ${c.titulo}\n`;
        md += `- **Detalle:** ${c.descripcion}\n`;
        if (c.fuente_imagen) md += `- **En Imagen:** ${c.fuente_imagen}\n`;
        if (c.fuente_texto) md += `- **En Notas:** ${c.fuente_texto}\n`;
        if (c.recomendacion) md += `- **Recomendación TPM:** ${c.recomendacion}\n`;
        md += `\n`;
      }
    });
  }

  if (proposal.extras_opcionales && proposal.extras_opcionales.length > 0) {
    md += `## 4. Extras Opcionales (0 Horas - Scope Isolation)\n\n`;
    proposal.extras_opcionales.forEach((e: any) => {
      if (typeof e === 'string') {
        md += `- ${e}\n`;
      } else {
        md += `- **${e.titulo}** (0h): ${e.descripcion} *(Detectado en: ${e.origen_detectado || 'Imágenes'})*\n`;
      }
    });
    md += `\n`;
  }

  if (proposal.sugerencias_proactivas && proposal.sugerencias_proactivas.length > 0) {
    md += `## 5. Sugerencias Proactivas (Modo Consultor)\n\n`;
    proposal.sugerencias_proactivas.forEach((s: any) => {
      if (typeof s === 'string') {
        md += `- ${s}\n`;
      } else {
        md += `- **[Impacto ${s.impacto || 'Recomendado'}] ${s.titulo}**: ${s.descripcion}\n`;
      }
    });
  }

  return md;
}

export async function exportHitosXlsx(proposal: ProposalResult) {
  const projectTitle = proposal.metadata?.proyecto || 'Proyecto';
  const projectSlug = proyectoSlug(proposal.metadata?.proyecto);
  const fileName = `hitos_backlog_${projectSlug}.xlsx`;

  // Fila 1: Títulos de columna principales en Negrita (con estilo ejecutivo azul marino)
  const headerRow: Row = [
    { value: 'Hito / Entregable', fontWeight: 'bold', backgroundColor: '#1E293B', textColor: '#FFFFFF', align: 'left' },
    { value: 'Meta y Alcance del Hito', fontWeight: 'bold', backgroundColor: '#1E293B', textColor: '#FFFFFF', align: 'left' },
    { value: 'ID Tarea', fontWeight: 'bold', backgroundColor: '#1E293B', textColor: '#FFFFFF', align: 'center' },
    { value: 'Título de la Tarea', fontWeight: 'bold', backgroundColor: '#1E293B', textColor: '#FFFFFF', align: 'left' },
    { value: 'Descripción Técnica', fontWeight: 'bold', backgroundColor: '#1E293B', textColor: '#FFFFFF', align: 'left' },
    { value: 'Rol Asignado', fontWeight: 'bold', backgroundColor: '#1E293B', textColor: '#FFFFFF', align: 'center' },
    { value: 'Horas Estimadas (Tarea)', fontWeight: 'bold', backgroundColor: '#1E293B', textColor: '#FFFFFF', align: 'right' },
    { value: 'Horas Totales del Hito', fontWeight: 'bold', backgroundColor: '#1E293B', textColor: '#FFFFFF', align: 'right' },
    { value: 'Proyecto', fontWeight: 'bold', backgroundColor: '#1E293B', textColor: '#FFFFFF', align: 'left' }
  ];

  const dataRows: Row[] = [headerRow];

  // Recorrer cada Hito y sus tareas técnicas
  proposal.hitos?.forEach((hito, hIdx) => {
    const totalHitoHours = horasPorHito(hito);
    const hitoName = hito.nombre_meta || `Hito ${hIdx + 1}`;

    // Fila distintiva del Hito con título en Negrita y fondo suave
    const milestoneBannerRow: Row = [
      { value: `HITO ${hIdx + 1}: ${hitoName.toUpperCase()}`, fontWeight: 'bold', backgroundColor: '#F1F5F9', textColor: '#0F172A' },
      { value: hito.nombre_meta || '', fontWeight: 'bold', backgroundColor: '#F1F5F9', textColor: '#0F172A' },
      { value: `H-${hIdx + 1}`, fontWeight: 'bold', align: 'center', backgroundColor: '#F1F5F9', textColor: '#0F172A' },
      { value: `ENTREGABLE (${hito.tareas?.length || 0} tareas)`, fontWeight: 'bold', backgroundColor: '#F1F5F9', textColor: '#0F172A' },
      { value: 'Consolidado del hito para gerencia', fontStyle: 'italic', backgroundColor: '#F1F5F9', textColor: '#475569' },
      { value: 'Equipo', align: 'center', backgroundColor: '#F1F5F9', textColor: '#475569' },
      { value: totalHitoHours, type: Number, fontWeight: 'bold', align: 'right', backgroundColor: '#F1F5F9', textColor: '#0F172A' },
      { value: totalHitoHours, type: Number, fontWeight: 'bold', align: 'right', backgroundColor: '#F1F5F9', textColor: '#0F172A' },
      { value: projectTitle, backgroundColor: '#F1F5F9', textColor: '#475569' }
    ];
    dataRows.push(milestoneBannerRow);

    // Tareas atómicas del hito (cada fila mantiene el título del hito en Negrita)
    hito.tareas?.forEach((t, tIdx) => {
      dataRows.push([
        { value: hitoName, fontWeight: 'bold', textColor: '#1E293B' },
        { value: hito.nombre_meta || '' },
        { value: `T-${hIdx + 1}.${tIdx + 1}`, align: 'center' },
        { value: t.titulo || '' },
        { value: t.descripcion || '' },
        { value: t.rol || 'General', align: 'center' },
        { value: Number(t.horas) || 0, type: Number, align: 'right' },
        { value: totalHitoHours, type: Number, align: 'right' },
        { value: projectTitle }
      ]);
    });
  });

  // Fila final de totales auditados
  const totalHours = proposal.horas_totales_validadas || 0;
  const totalRow: Row = [
    { value: 'TOTAL MASTER DE HORAS VALIDADAS', fontWeight: 'bold', backgroundColor: '#0F172A', textColor: '#FFFFFF' },
    { value: `${proposal.hitos?.length || 0} Hitos Validados`, fontWeight: 'bold', backgroundColor: '#0F172A', textColor: '#E2E8F0' },
    { value: 'TOTAL', fontWeight: 'bold', align: 'center', backgroundColor: '#0F172A', textColor: '#FFFFFF' },
    { value: 'Auditado bajo Master Truth (Principio de Verdad)', fontWeight: 'bold', backgroundColor: '#0F172A', textColor: '#E2E8F0' },
    { value: '', backgroundColor: '#0F172A' },
    { value: 'Varios', align: 'center', backgroundColor: '#0F172A', textColor: '#FFFFFF' },
    { value: Number(totalHours), type: Number, fontWeight: 'bold', align: 'right', backgroundColor: '#0F172A', textColor: '#38BDF8' },
    { value: Number(totalHours), type: Number, fontWeight: 'bold', align: 'right', backgroundColor: '#0F172A', textColor: '#38BDF8' },
    { value: projectTitle, backgroundColor: '#0F172A', textColor: '#E2E8F0' }
  ];
  dataRows.push(totalRow);

  const columns = [
    { width: 34 }, // Hito / Entregable
    { width: 40 }, // Meta y Alcance
    { width: 14 }, // ID Tarea
    { width: 38 }, // Título de la Tarea
    { width: 46 }, // Descripción Técnica
    { width: 18 }, // Rol Asignado
    { width: 22 }, // Horas Estimadas (Tarea)
    { width: 20 }, // Horas Totales del Hito
    { width: 26 }  // Proyecto
  ];

  // Hoja 2: Resumen Ejecutivo de Hitos para Directores
  const summaryHeaderRow: Row = [
    { value: '# Hito', fontWeight: 'bold', backgroundColor: '#1E293B', textColor: '#FFFFFF', align: 'center' },
    { value: 'Título del Hito', fontWeight: 'bold', backgroundColor: '#1E293B', textColor: '#FFFFFF', align: 'left' },
    { value: 'Meta y Objetivo', fontWeight: 'bold', backgroundColor: '#1E293B', textColor: '#FFFFFF', align: 'left' },
    { value: 'Tareas Atómicas', fontWeight: 'bold', backgroundColor: '#1E293B', textColor: '#FFFFFF', align: 'center' },
    { value: 'Horas Validadas', fontWeight: 'bold', backgroundColor: '#1E293B', textColor: '#FFFFFF', align: 'right' },
    { value: '% Esfuerzo', fontWeight: 'bold', backgroundColor: '#1E293B', textColor: '#FFFFFF', align: 'right' },
    { value: 'Perfiles Requeridos', fontWeight: 'bold', backgroundColor: '#1E293B', textColor: '#FFFFFF', align: 'left' }
  ];

  const summaryDataRows: Row[] = [summaryHeaderRow];

  proposal.hitos?.forEach((hito, idx) => {
    const hitoHours = horasPorHito(hito);
    const percentage = totalHours > 0 ? ((hitoHours / totalHours) * 100).toFixed(1) + '%' : '0%';
    const roles = rolesUnicos(hito.tareas).join(', ');

    summaryDataRows.push([
      { value: `Hito ${idx + 1}`, align: 'center', fontWeight: 'bold' },
      { value: hito.nombre_meta || `Hito ${idx + 1}`, fontWeight: 'bold', textColor: '#0F172A' },
      { value: hito.nombre_meta || '' },
      { value: hito.tareas?.length || 0, type: Number, align: 'center' },
      { value: hitoHours, type: Number, fontWeight: 'bold', align: 'right' },
      { value: percentage, align: 'right' },
      { value: roles }
    ]);
  });

  summaryDataRows.push([
    { value: 'TOTAL', fontWeight: 'bold', backgroundColor: '#0F172A', textColor: '#FFFFFF', align: 'center' },
    { value: 'Presupuesto Total del Proyecto', fontWeight: 'bold', backgroundColor: '#0F172A', textColor: '#FFFFFF' },
    { value: 'Consolidado Validado', backgroundColor: '#0F172A', textColor: '#FFFFFF' },
    { value: contarTareas(proposal.hitos), type: Number, fontWeight: 'bold', align: 'center', backgroundColor: '#0F172A', textColor: '#FFFFFF' },
    { value: Number(totalHours), type: Number, fontWeight: 'bold', align: 'right', backgroundColor: '#0F172A', textColor: '#38BDF8' },
    { value: '100%', fontWeight: 'bold', align: 'right', backgroundColor: '#0F172A', textColor: '#38BDF8' },
    { value: projectTitle, backgroundColor: '#0F172A', textColor: '#FFFFFF' }
  ]);

  const summaryColumns = [
    { width: 14 },
    { width: 36 },
    { width: 44 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 34 }
  ];

  // Libro de Excel con ambas hojas estructuradas
  const sheets: Sheet<Blob>[] = [
    {
      sheet: 'Hitos y Tareas',
      data: dataRows,
      columns
    },
    {
      sheet: 'Resumen Gerencial',
      data: summaryDataRows,
      columns: summaryColumns
    }
  ];

  const result = writeXlsxFile(sheets);
  const blob = await result.toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportHitosCsv(proposal: ProposalResult) {
  const projectTitle = proposal.metadata?.proyecto || 'Proyecto';
  const rows: string[][] = [
    ['Hito / Meta', 'Tarea', 'Descripción', 'Rol Asignado', 'Horas Estimadas', 'Horas Totales Hito', 'Proyecto']
  ];

  proposal.hitos?.forEach((hito, hIdx) => {
    const totalHitoHours = horasPorHito(hito);
    const hitoName = hito.nombre_meta || `Hito ${hIdx + 1}`;

    hito.tareas?.forEach(t => {
      rows.push([
        `"${hitoName.replace(/"/g, '""')}"`,
        `"${(t.titulo || '').replace(/"/g, '""')}"`,
        `"${(t.descripcion || '').replace(/"/g, '""')}"`,
        `"${(t.rol || 'General').replace(/"/g, '""')}"`,
        `${t.horas || 0}`,
        `${totalHitoHours}`,
        `"${projectTitle.replace(/"/g, '""')}"`
      ]);
    });
  });

  // Include UTF-8 Byte Order Mark (\uFEFF) so Excel correctly displays Spanish accents & special characters
  const csvContent = '\uFEFF' + rows.map(e => e.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const projectSlug = proyectoSlug(proposal.metadata?.proyecto);
  link.download = `hitos_backlog_${projectSlug}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToJiraCsv(proposal: ProposalResult) {
  const rows = [
    ['Issue Type', 'Summary', 'Description', 'Component/Role', 'Original Estimate (Hours)', 'Milestone']
  ];

  proposal.hitos?.forEach(hito => {
    hito.tareas?.forEach(t => {
      rows.push([
        'Story',
        `"${(t.titulo || '').replace(/"/g, '""')}"`,
        `"${(t.descripcion || '').replace(/"/g, '""')}"`,
        `"${t.rol || 'General'}"`,
        `${t.horas || 0}`,
        `"${(hito.nombre_meta || '').replace(/"/g, '""')}"`
      ]);
    });
  });

  const csvContent = rows.map(e => e.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const projectSlug = proyectoSlug(proposal.metadata?.proyecto);
  link.download = `backlog_jira_${projectSlug}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
