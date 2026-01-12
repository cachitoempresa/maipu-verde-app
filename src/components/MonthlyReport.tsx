import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, 
  ImageRun, TextRun, AlignmentType, BorderStyle 
} from 'docx';
import { saveAs } from 'file-saver';
import { FileText, Download, Loader2, Calendar } from 'lucide-react';

// 👇 URL DEL LOGO (Opcional)
const LOGO_URL = "https://1drv.ms/i/c/c1b960db58138965/IQCk2WOxGJo0TbdWPMDAzHrcAQ0cz15W7KREFM0Wm5afofk?e=sVqLXL"; 

export function MonthlyReport() {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Función para descargar imagen y procesarla para Word
  const urlToBuffer = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return await blob.arrayBuffer();
    } catch (error) {
      console.error("Error descargando imagen", error);
      return null;
    }
  };

  const generateDoc = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];
      
      const monthName = new Date(Number(year), Number(month) - 1, 2)
        .toLocaleString('es-CL', { month: 'long' })
        .toUpperCase();

      // 1. Traer datos de la Nube
      const { data: logs, error } = await supabase
        .from('logs')
        .select('*, green_areas(code, name)')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate + ' 23:59:59')
        .order('timestamp', { ascending: true });

      if (error) throw error;
      if (!logs || logs.length === 0) {
        alert("No hay registros en este mes.");
        setLoading(false);
        return;
      }

      // Configuración de Secciones
      const sections = [
        { key: 'ASEO', title: 'Aseo y Recolección diaria', desc: 'Barrido, retiro de residuos y limpieza de mobiliario.' },
        { key: 'RIEGO', title: 'Riego (Aljibe y Manual)', desc: 'Riego programado según necesidad hídrica.' },
        { key: 'CORTE', title: 'Corte de Césped', desc: 'Corte y perfilado en áreas operativas.' },
        { key: 'PODA', title: 'Poda y Arborización', desc: 'Podas de despeje, formación y seguridad.' },
        { key: 'INFRAESTRUCTURA', title: 'Infraestructura y Mobiliario', desc: 'Mantención y reparación de equipamiento.' },
        { key: 'COBERTURA', title: 'Cobertura Natural', desc: 'Manejo de especies vegetales y cubresuelos.' },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docChildren: any[] = [];

      // ===========================
      // 1. ENCABEZADO EXACTO
      // ===========================
      
      const logoBuffer = await urlToBuffer(LOGO_URL);
      if (logoBuffer) {
        docChildren.push(
            new Paragraph({
                children: [
                    new ImageRun({
                        data: logoBuffer,
                        transformation: { width: 80, height: 80 },
                        type: "png"
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 }
            })
        );
      }

      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: "INFORME MENSUAL", bold: true, size: 28, font: "Calibri" })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: monthName, bold: true, size: 36, color: "E36C09", font: "Calibri" })], 
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [new TextRun({ text: "COOPERATIVA DE TRABAJO SOL PONIENTE", bold: true, size: 24, font: "Calibri" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "Cooperativa de Trabajo Sol Poniente – Zona 1", size: 22, font: "Calibri" }),
            ],
            alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
            children: [
                new TextRun({ text: `Período informado: 1 al ${new Date(Number(year), Number(month), 0).getDate()} de ${monthName.toLowerCase()} de ${year}`, size: 22, font: "Calibri" }),
            ],
            alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "Supervisor zona: Esteban Núñez", size: 22, font: "Calibri" })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 } 
        }),
        
        new Paragraph({
            children: [new TextRun({ text: "RESUMEN EJECUTIVO", bold: true, size: 24, underline: {}, font: "Calibri" })],
            spacing: { after: 200 }
        }),
        new Paragraph({
            children: [new TextRun({ 
                text: `Durante ${monthName.toLowerCase()} de ${year} se ejecutaron las labores correspondientes al contrato de mantención de áreas verdes de la Zona 1. El cumplimiento global del programa se ejecutó con normalidad.`,
                font: "Calibri",
                size: 22
            })],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 400 }
        })
      );

      // ===========================
      // 2. SECCIONES OPERATIVAS
      // ===========================
      for (const section of sections) {
        const sectionLogs = logs.filter(l => l.activity_type.includes(section.key));
        const logsWithPhotos = sectionLogs.filter(l => l.photo_url);

        // Título Azul
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: section.title, bold: true, size: 24, color: "2E74B5", font: "Calibri" })],
            spacing: { before: 400, after: 100 },
          })
        );

        // Bloque de Resumen
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({ text: "Estado de ejecución: ", bold: true, font: "Calibri", size: 22 }),
                    new TextRun({ text: sectionLogs.length > 0 ? "Ejecutado según programación." : "Sin actividad registrada.", font: "Calibri", size: 22 })
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Actividades realizadas: ", bold: true, font: "Calibri", size: 22 }),
                    new TextRun({ text: section.desc, font: "Calibri", size: 22 })
                ],
                spacing: { after: 200 }
            })
        );

        // GRID DE FOTOS
        if (logsWithPhotos.length > 0) {
            docChildren.push(
                new Paragraph({ 
                    children: [new TextRun({ text: "Registro fotográfico", bold: true, italics: true, color: "595959", font: "Calibri", size: 20 })], 
                    spacing: { after: 100 },
                    alignment: AlignmentType.LEFT
                })
            );

            const photoRows = [];
            for (let i = 0; i < logsWithPhotos.length; i += 2) {
                const log1 = logsWithPhotos[i];
                const log2 = logsWithPhotos[i+1];

                const buffer1 = await urlToBuffer(log1.photo_url);
                const buffer2 = log2 ? await urlToBuffer(log2.photo_url) : null;

                const cell1Children = [];
                if (buffer1) {
                    cell1Children.push(
                        new Paragraph({
                            children: [new ImageRun({ data: buffer1, transformation: { width: 280, height: 210 }, type: "jpg" })],
                            alignment: AlignmentType.CENTER
                        }),
                        new Paragraph({ 
                            children: [new TextRun({ text: `${log1.green_areas?.name}`, size: 18, font: "Calibri" })],
                            alignment: AlignmentType.CENTER 
                        })
                    );
                }

                const cell2Children = [];
                if (buffer2 && log2) {
                    cell2Children.push(
                        new Paragraph({
                            children: [new ImageRun({ data: buffer2, transformation: { width: 280, height: 210 }, type: "jpg" })],
                            alignment: AlignmentType.CENTER
                        }),
                        new Paragraph({ 
                            children: [new TextRun({ text: `${log2.green_areas?.name}`, size: 18, font: "Calibri" })],
                            alignment: AlignmentType.CENTER 
                        })
                    );
                }

                photoRows.push(
                    new TableRow({
                        children: [
                            new TableCell({ 
                                children: cell1Children, 
                                width: { size: 50, type: WidthType.PERCENTAGE },
                                borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } }
                            }),
                            new TableCell({ 
                                children: cell2Children, 
                                width: { size: 50, type: WidthType.PERCENTAGE },
                                borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } }
                            }),
                        ],
                    })
                );
            }

            docChildren.push(new Table({
                rows: photoRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL }, insideVertical: { style: BorderStyle.NIL }, insideHorizontal: { style: BorderStyle.NIL } }
            }));
        }
      }

      // ===========================
      // 3. EMERGENCIAS (TABLA CORREGIDA)
      // ===========================
      const emergencyLogs = logs.filter(l => l.activity_type === 'INCIDENCIA' || l.activity_type === 'EMERGENCIA');
      
      if (emergencyLogs.length > 0) {
          docChildren.push(
            new Paragraph({ text: "", pageBreakBefore: true }),
            new Paragraph({
                children: [new TextRun({ text: "Emergencias / Contingencias", bold: true, size: 24, color: "2E74B5", font: "Calibri" })],
                spacing: { after: 200 }
            })
          );

          const emergencyRows = [
            new TableRow({
                tableHeader: true,
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "FECHA", bold: true, size: 20 })] })], shading: { fill: "D9D9D9" } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TIPO", bold: true, size: 20 })] })], shading: { fill: "D9D9D9" } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "UBICACIÓN", bold: true, size: 20 })] })], shading: { fill: "D9D9D9" } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DETALLE", bold: true, size: 20 })] })], shading: { fill: "D9D9D9" } }),
                ],
            })
          ];

          emergencyLogs.forEach(log => {
            emergencyRows.push(new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: new Date(log.timestamp).toLocaleDateString(), size: 20 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Emergencia", size: 20 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: log.green_areas?.name || 'S/N', size: 20 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: log.description || '-', size: 20 })] })] }),
                ],
            }));
          });

          docChildren.push(new Table({ rows: emergencyRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      }

      const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Informe_SolPoniente_${monthName}_${year}.docx`);
      alert("✅ Informe generado con éxito.");

    } catch (error) {
      console.error(error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alert("Error: " + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-maipu-600" />
            Informes Automáticos
        </h3>
        <span className="text-xs font-medium text-white bg-maipu-600 px-2 py-1 rounded">Formato Sol Poniente</span>
      </div>
      <div className="flex items-end gap-4">
        <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mes a Reportar</label>
            <div className="relative">
                <input 
                    type="month" 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maipu-500 outline-none"
                />
                <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
        </div>
        <button 
            onClick={generateDoc}
            disabled={loading}
            className="bg-maipu-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-maipu-700 flex items-center gap-2 shadow-lg disabled:opacity-70 h-[42px] min-w-[180px] justify-center"
        >
            {loading ? <Loader2 className="animate-spin" /> : <Download size={20} />}
            {loading ? "Generando..." : "Descargar DOCX"}
        </button>
      </div>
    </div>
  );
}