import React, { useState, useMemo } from 'react';
import { ProposalResult } from '../types';
import { exportHitosXlsx, exportHitosCsv, downloadJsonFile } from '../utils/helpers';
import { CAPACIDAD_SEMANAL_HORAS } from '../lib/domain/constants';
import { calcularMetricas } from '../lib/domain/metricas';
import {
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Users,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  Printer,
  Copy,
  Check,
  ArrowRight,
  Layers,
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface ExecutiveManagementPanelProps {
  proposal: ProposalResult;
  hourlyRate: number;
  setHourlyRate: (rate: number) => void;
  onNavigateTab: (tab: 'backlog' | 'conflictos' | 'extras' | 'sugerencias' | 'exportar') => void;
}

export const ExecutiveManagementPanel: React.FC<ExecutiveManagementPanelProps> = ({
  proposal,
  hourlyRate,
  setHourlyRate,
  onNavigateTab
}) => {
  // Configurable start date for timeline projection
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const [startDateStr, setStartDateStr] = useState<string>(todayStr);
  const [teamCapacityWeekly, setTeamCapacityWeekly] = useState<number>(CAPACIDAD_SEMANAL_HORAS);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Única fuente de cómputo: horas, roles, sprints, costos y cronograma (lib/domain, Fase 4).
  const metricas = useMemo(
    () => calcularMetricas({
      proposal,
      tarifaHora: hourlyRate,
      capacidadSemanal: teamCapacityWeekly,
      startDate: new Date(startDateStr)
    }),
    [proposal, hourlyRate, teamCapacityWeekly, startDateStr]
  );

  const totalHours = metricas.totalHoras;
  const totalHitos = metricas.totalHitos;
  const totalTasks = metricas.totalTareas;
  const estimatedCost = metricas.costoEstimado;
  const workingWeeks = metricas.semanasHabiles;
  const estimatedSprints = metricas.sprintsEstimados;

  const roleMetrics = metricas.rolesPorHoras.map(r => ({
    role: r.rol,
    hours: r.horas,
    tasksCount: r.tareas,
    percentage: r.porcentaje,
    cost: r.costo
  }));

  // Projected Milestone Delivery Dates
  const hitosWithDates = metricas.hitosProyectados.map(hp => ({
    ...hp.hito,
    index: hp.index,
    hours: hp.horas,
    cost: hp.costo,
    percentage: hp.porcentaje.toFixed(1),
    deliveryDate: hp.fechaEntrega.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }),
    tasksCount: hp.hito.tareas?.length || 0
  }));

  // Overall End Date
  const projectedEndDate = metricas.fechaFinProyecto.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formattedStartDate = useMemo(() => {
    const start = new Date(startDateStr);
    return start.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [startDateStr]);

  const conflictsCount = metricas.conflictosCount;
  const extrasCount = metricas.extrasCount;
  const suggestionsCount = metricas.sugerenciasCount;

  // Risk Level presentation — el umbral en sí vive en lib/domain/riesgo.ts
  const riskLevel = useMemo(() => {
    switch (metricas.nivelRiesgo) {
      case 'atencion':
        return { label: 'Atención Requerida', color: 'text-rose-700 bg-rose-50 border-rose-200' };
      case 'controlado':
        return { label: 'Bajo Control (Autoresuelto)', color: 'text-amber-800 bg-amber-50 border-amber-200' };
      default:
        return { label: 'Riesgo Mínimo', color: 'text-emerald-800 bg-emerald-50 border-emerald-200' };
    }
  }, [metricas.nivelRiesgo]);

  // Copy Executive Memo
  const handleCopyExecutiveMemo = () => {
    const projectName = proposal.metadata?.proyecto || 'Proyecto Técnico';
    const memo = `### INFORME EJECUTIVO PARA LA GERENCIA DEL ÁREA
**Proyecto:** ${projectName}
**Estado:** Presupuesto y Backlog Validado por Senior TPM
**Fecha de Inicio Estimada:** ${formattedStartDate}
**Fecha de Finalización Estimada:** ${projectedEndDate} (${workingWeeks} semanas / ~${estimatedSprints} sprints)

#### 1. INDICADORES CLAVE (KPIs)
- **Cantidad de Hitos:** ${totalHitos} hitos secuenciales
- **Cantidad de Tareas Atómicas:** ${totalTasks} tareas técnicas
- **Cantidad de Horas Validadas:** ${totalHours} horas (Master Truth)
- **Inversión Presupuestada:** $${estimatedCost.toLocaleString()} USD (Tarifa simulada: $${hourlyRate}/h)
- **Capacidad de Equipo Considerada:** ${teamCapacityWeekly}h/semana (~${teamCapacityWeekly / CAPACIDAD_SEMANAL_HORAS} FTE)

#### 2. RESUMEN DEL PROYECTO
${proposal.resumen_ejecutivo}

#### 3. HOJA DE RUTA Y FECHAS POR HITO
${hitosWithDates.map(h => `- **Hito ${h.index}: ${h.nombre_meta}** | ${h.hours}h ($${h.cost.toLocaleString()} USD) | Entrega aprox: ${h.deliveryDate}`).join('\n')}

#### 4. DISTRIBUCIÓN DE HORAS POR ROL
${roleMetrics.map(r => `- **${r.role}:** ${r.hours}h (${r.percentage.toFixed(1)}%) - $${r.cost.toLocaleString()} USD`).join('\n')}

#### 5. GOBERNANZA DE ALCANCE Y RIESGOS
- **Discrepancias entre notas y bocetos resueltas:** ${conflictsCount}
- **Funcionalidades extras aisladas a 0h (anti scope-creep):** ${extrasCount}
- **Gaps y sugerencias estratégicas:** ${suggestionsCount}
`;

    navigator.clipboard.writeText(memo);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Executive Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[11px] font-semibold tracking-wide uppercase">
              <Briefcase className="w-3 h-3" />
              Vista Exclusiva Gerencial
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Panel de Resumen para la Gerencia
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Consolidado estratégico para directores y líderes de área: hitos, volumen de horas, cronograma de fechas, costos proyectados y gobernanza de alcance.
            </p>
          </div>

          {/* Action buttons for Management */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-copy-exec-memo"
              onClick={handleCopyExecutiveMemo}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer shadow-xs"
              title="Copiar informe ejecutivo para enviar por correo a Gerencia"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">¡Copiado al portapapeles!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                  <span>Copiar Minuta Gerencial</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="btn-print-exec-report"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all cursor-pointer"
              title="Imprimir o guardar reporte ejecutivo en PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              type="button"
              id="btn-export-hitos-xlsx-gerencia"
              onClick={() => exportHitosXlsx(proposal)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer"
              title="Descargar Hitos y tareas en formato Excel (.xlsx) con títulos en negrita"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Descargar Hitos (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Primary Executive KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Cantidad de Hitos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cantidad de Hitos
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-bold text-slate-900 tracking-tight">
                {totalHitos}
              </span>
              <span className="text-xs font-medium text-slate-500">entregables clave</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Divididos en {totalTasks} tareas atómicas
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('backlog')}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer pt-2 border-t border-slate-100"
          >
            <span>Ver desglose técnico detallado</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* KPI 2: Cantidad de Horas Validadas */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Horas de Ingeniería
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-bold text-indigo-600 tracking-tight">
                {totalHours}h
              </span>
              <span className="text-xs font-medium text-slate-500">validadas</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Basadas en principio estricto de verdad
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Blindaje anti-sobrecostos</span>
            <span className="font-semibold text-emerald-700">✓ 100% Auditado</span>
          </div>
        </div>

        {/* KPI 3: Fechas y Cronograma */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Fechas y Cronograma
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 tracking-tight">
                {workingWeeks} sem
              </span>
              <span className="text-xs font-medium text-slate-500">(~{estimatedSprints} sprints)</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1 font-medium">
              Go-Live aprox: <strong className="text-slate-900">{projectedEndDate}</strong>
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Inicio: {formattedStartDate}</span>
          </div>
        </div>

        {/* KPI 4: Presupuesto Proyectado */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Presupuesto Proyectado
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-mono font-bold text-slate-900 tracking-tight">
                ${estimatedCost.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-slate-500">USD</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Promedio: ${(estimatedCost / Math.max(1, totalHitos)).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD / hito
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
            <span className="text-slate-500">Tarifa sim:</span>
            <select
              value={hourlyRate}
              onChange={e => setHourlyRate(Number(e.target.value))}
              className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-semibold text-slate-800 text-[11px] cursor-pointer"
            >
              <option value={30}>$30/h</option>
              <option value={35}>$35/h (Estándar)</option>
              <option value={45}>$45/h</option>
              <option value={60}>$60/h</option>
              <option value={80}>$80/h (Senior)</option>
              <option value={100}>$100/h</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resumen del Proyecto y Propuesta de Valor */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Resumen Ejecutivo del Proyecto &amp; Propuesta de Valor
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${riskLevel.color}`}>
              {riskLevel.label}
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
          {proposal.resumen_ejecutivo}
        </p>

        {/* Highlighted Strategic Objectives */}
        <div className="pt-3 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Metas Principales a ser Entregadas a la Gerencia:
          </h4>
          <div className="grid sm:grid-cols-2 gap-2">
            {hitosWithDates.map(h => (
              <div key={h.index} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-semibold">
                    Hito {h.index}: {h.nombre_meta}
                  </strong>
                  <span className="text-[11px] text-slate-500">
                    {h.hours} horas ({h.percentage}% del esfuerzo total)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Simulator: Interactive Timeline & Capacity Setting */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            Simulador de Planificación para la Gerencia
          </h4>
          <p className="text-[11px] text-slate-500">
            Ajusta la fecha de inicio o la capacidad asignada del equipo para recalcular las fechas de entrega automáticamente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Start Date Picker */}
          <div className="flex items-center gap-1.5 text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
            <span className="text-slate-500 font-medium">Inicio:</span>
            <input
              type="date"
              value={startDateStr}
              onChange={e => setStartDateStr(e.target.value)}
              className="text-xs font-semibold text-slate-800 focus:outline-none bg-transparent cursor-pointer"
            />
          </div>

          {/* Velocity / Headcount Selector */}
          <div className="flex items-center gap-1.5 text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Capacidad:</span>
            <select
              value={teamCapacityWeekly}
              onChange={e => setTeamCapacityWeekly(Number(e.target.value))}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value={20}>20h/sem (Part-Time)</option>
              <option value={40}>40h/sem (1 Dev Full-Time)</option>
              <option value={80}>80h/sem (Equipo 2 Devs)</option>
              <option value={120}>120h/sem (Equipo 3 Devs)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2-Column: Milestone Roadmap & Resource Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Milestone Roadmap with Dates */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Cronograma Proyectado de Hitos (Roadmap)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Estimación secuencial de entregables según capacidad de {teamCapacityWeekly}h/semana
              </p>
            </div>
            <button
              type="button"
              id="btn-export-hitos-xlsx-roadmap"
              onClick={() => exportHitosXlsx(proposal)}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-xs transition-colors"
              title="Descargar Hitos en formato Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Excel (.xlsx)</span>
            </button>
          </div>

          <div className="space-y-3">
            {hitosWithDates.map(hito => (
              <div
                key={hito.index}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors bg-white shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                        {hito.index}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {hito.nombre_meta}
                      </h4>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold text-xs">
                      📅 {hito.deliveryDate}
                    </span>
                  </div>
                </div>

                {/* Progress & metrics bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {hito.hours} horas ({hito.tasksCount} tareas)
                    </span>
                    <span className="font-semibold text-slate-800">
                      ${hito.cost.toLocaleString()} USD ({hito.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.max(8, Number(hito.percentage)))}%` }}
                    ></div>
                  </div>
                </div>

                {/* Preview of first 2 tasks */}
                <div className="text-[11px] text-slate-600 flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
                  <span className="text-slate-400 font-medium">Perfiles requeridos:</span>
                  {Array.from(new Set(hito.tareas?.map(t => t.rol || 'Fullstack'))).map(r => (
                    <span key={r} className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (5 cols): Resource Allocation & Risk Matrix */}
        <div className="lg:col-span-5 space-y-5">
          {/* Resource Allocation by Role */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Asignación de Recursos por Perfil
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Headcount y dedicación técnica requerida
              </p>
            </div>

            {/* Stacked bar visualization */}
            <div className="space-y-1.5">
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100">
                {roleMetrics.map((r, i) => {
                  const colors = [
                    'bg-indigo-600',
                    'bg-blue-500',
                    'bg-emerald-500',
                    'bg-purple-500',
                    'bg-amber-500',
                    'bg-pink-500'
                  ];
                  const bg = colors[i % colors.length];
                  return (
                    <div
                      key={r.role}
                      title={`${r.role}: ${r.hours}h (${r.percentage.toFixed(1)}%)`}
                      style={{ width: `${r.percentage}%` }}
                      className={`${bg} h-full transition-all`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Roles Table */}
            <div className="space-y-2">
              {roleMetrics.map(r => (
                <div key={r.role} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    <span className="font-semibold text-slate-800">{r.role}</span>
                    <span className="text-slate-400 text-[10px]">({r.tasksCount} tareas)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900">{r.hours}h</span>
                    <span className="text-slate-500 text-[11px] ml-1.5">({r.percentage.toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Governance & Risk Shield */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3.5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Gobernanza y Blindaje de Alcance
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-900 block">
                    Regla de Verdad (Master Truth) Aplicada
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Las discrepancias entre notas del cliente y bocetos gráficos fueron conciliadas automáticamente priorizando la última directiva confirmada.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 block">
                      Extras Opcionales Aislados: {extrasCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('extras')}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Ver extras →
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Elementos detectados en capturas de pantalla pero no solicitados por el cliente quedaron en <strong>0 horas</strong> para no inflar el presupuesto.
                  </p>
                </div>
              </div>

              {conflictsCount > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold block">
                        {conflictsCount} Alertas de Conflicto Documentadas
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigateTab('conflictos')}
                        className="text-[10px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                      >
                        Revisar alertas →
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-800/90 leading-relaxed">
                      La Gerencia cuenta con la justificación técnica de cada ajuste para defender el presupuesto ante auditorías.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
