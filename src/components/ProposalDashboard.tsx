import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ShieldCheck,
  Download,
  Copy,
  Clock,
  DollarSign,
  Users,
  Search,
  Filter,
  FileCode,
  FileSpreadsheet,
  Check,
  ChevronDown,
  ChevronUp,
  Tag,
  Code2,
  Briefcase
} from 'lucide-react';
import { ProposalResult } from '../types';
import { downloadJsonFile, exportHitosXlsx, exportHitosCsv, exportToJiraCsv, generateMarkdownExport } from '../utils/helpers';
import { ExecutiveManagementPanel } from './ExecutiveManagementPanel';
import { RecalculationNotice } from './RecalculationNotice';
import { TARIFA_HORA_USD, CAPACIDAD_SEMANAL_HORAS } from '../lib/domain/constants';
import { calcularSprints } from '../lib/domain/sprints';
import { calcularCosto } from '../lib/domain/costos';
import { describirRecalculo } from '../lib/domain/recalculo';
import { horasPorHito } from '../lib/domain/horas';
import { agregarHorasPorRol } from '../lib/domain/roles';
import { proyectoSlug } from '../lib/domain/slug';

interface ProposalDashboardProps {
  proposal: ProposalResult;
  isStakeholderView?: boolean;
}

export const ProposalDashboard: React.FC<ProposalDashboardProps> = ({ proposal, isStakeholderView = false }) => {
  const [activeTab, setActiveTab] = useState<'gerencia' | 'backlog' | 'conflictos' | 'extras' | 'sugerencias' | 'exportar'>('gerencia');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hourlyRate, setHourlyRate] = useState<number>(TARIFA_HORA_USD);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [collapsedHitos, setCollapsedHitos] = useState<Record<string, boolean>>({});

  // Compute metrics
  const totalHours = proposal.horas_totales_validadas || 0;
  const estimatedSprints = calcularSprints(totalHours, CAPACIDAD_SEMANAL_HORAS);
  const estimatedCost = calcularCosto(totalHours, hourlyRate);
  const ajustesRecalculo = describirRecalculo(totalHours, CAPACIDAD_SEMANAL_HORAS, hourlyRate);

  // Extract all unique roles with their aggregated hours
  const rolesAgregados = agregarHorasPorRol(proposal.hitos);
  const roleHoursMap: Record<string, number> = Object.fromEntries(rolesAgregados.map(r => [r.rol, r.horas]));
  const availableRoles = rolesAgregados.map(r => r.rol);

  const toggleTaskCompletion = (taskKey: string) => {
    setCompletedTasks(prev => ({
      ...prev,
      [taskKey]: !prev[taskKey]
    }));
  };

  const toggleHitoCollapse = (hitoName: string) => {
    setCollapsedHitos(prev => ({
      ...prev,
      [hitoName]: !prev[hitoName]
    }));
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getRoleColor = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('back')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (r.includes('front')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (r.includes('devops')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (r.includes('qa')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (r.includes('ui') || r.includes('ux') || r.includes('diseñ')) return 'bg-pink-50 text-pink-700 border-pink-200';
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  const filteredHitos = (proposal.hitos || []).map(hito => {
    const filteredTareas = (hito.tareas || []).filter(t => {
      const matchRole = roleFilter === 'all' || (t.rol || '').toLowerCase() === roleFilter.toLowerCase();
      const matchSearch =
        !searchQuery ||
        t.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRole && matchSearch;
    });
    return {
      ...hito,
      tareas: filteredTareas
    };
  }).filter(h => h.tareas.length > 0 || searchQuery === '');

  const conflictsCount = proposal.alertas_conflictos?.length || 0;
  const extrasCount = proposal.extras_opcionales?.length || 0;
  const suggestionsCount = proposal.sugerencias_proactivas?.length || 0;

  return (
    <div className="space-y-5">
      {/* Proposal Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
            {isStakeholderView ? (
              <>
                <span>Propuesta y Resumen Final</span>
                <span className="text-xs font-normal bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                  Gerencial
                </span>
              </>
            ) : (
              <>
                <span>Generated Proposal</span>
                <span className="text-sm font-normal text-slate-400">(Architect JSON Output)</span>
              </>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isStakeholderView
              ? 'Consolidado ejecutivo de hitos, estimaciones de horas y presupuesto para toma de decisiones'
              : 'Presupuesto técnico y backlog desglosado bajo reglas de Master Truth'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            id="btn-download-hitos-xlsx-header"
            onClick={() => exportHitosXlsx(proposal)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs transition-colors cursor-pointer"
            title="Descargar todos los hitos y tareas en formato Excel (.xlsx) con títulos en negrita"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Descargar Hitos (.xlsx)</span>
          </button>

          {!isStakeholderView && (
            <button
              type="button"
              id="btn-download-json-header"
              onClick={() => {
                const slug = proyectoSlug(proposal.metadata?.proyecto, 'backlog');
                downloadJsonFile(proposal, `propuesta_${slug}.json`);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs transition-colors cursor-pointer"
              title="Descargar la propuesta completa en formato JSON puro (Admin)"
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-600" />
              <span>Descargar JSON</span>
            </button>
          )}

          <div className="sm:text-right pl-2 border-l border-slate-200">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Horas Validadas</p>
            <p className="text-xl sm:text-2xl font-mono font-bold text-indigo-600">{totalHours}.0h</p>
          </div>
        </div>
      </div>

      {!isStakeholderView && (
        <RecalculationNotice ajustes={ajustesRecalculo} proyecto={proposal.metadata?.proyecto} />
      )}

      {/* Top Metrics & Cards (only shown on non-gerencia tabs) */}
      {activeTab !== 'gerencia' && (
        <>
          {/* Top Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Horas Totales Validadas */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Horas Validadas</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-indigo-600 tracking-tight">
              {totalHours}
            </span>
            <span className="text-xs font-medium text-slate-500">horas (Master Truth)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Excluye extras no pedidos en texto
          </p>
        </div>

        {/* Metric 2: Sprints Estimados */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Sprints Estimados</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 tracking-tight">
              {estimatedSprints}
            </span>
            <span className="text-xs font-medium text-slate-500">sprints (~2 sem c/u)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {CAPACIDAD_SEMANAL_HORAS}h capacidad/semana · {CAPACIDAD_SEMANAL_HORAS * 2}h por sprint
          </p>
        </div>

        {/* Metric 3: Presupuesto Proyectado */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Presupuesto Estimado</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 tracking-tight">
              ${estimatedCost.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500">USD</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[11px] text-slate-400">Tarifa:</span>
            <select
              value={hourlyRate}
              onChange={e => setHourlyRate(Number(e.target.value))}
              className="text-[11px] font-semibold text-slate-700 bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200 cursor-pointer"
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

        {/* Metric 4: Equipo y Conflictos */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Perfiles &amp; Gaps</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {availableRoles.slice(0, 3).map(r => (
              <span key={r} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                {r} ({roleHoursMap[r]}h)
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px]">
            <span className="text-amber-700 font-medium">⚠️ {conflictsCount} discrepancias</span>
            <span className="text-indigo-700 font-medium">💡 {suggestionsCount} gaps</span>
          </div>
        </div>
      </div>

      {/* 3 Summary Highlight Cards from Professional Polish Design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Alertas de Conflicto */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center justify-between">
              <span>Alertas de Conflicto</span>
              <span className="font-mono text-rose-600 font-bold">{conflictsCount}</span>
            </h3>
            {conflictsCount > 0 ? (
              <div className="flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-100 p-3 rounded-xl text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">
                    {typeof proposal.alertas_conflictos[0] === 'string'
                      ? proposal.alertas_conflictos[0]
                      : proposal.alertas_conflictos[0].titulo}
                  </span>
                  <p className="text-[11px] text-rose-700/80 line-clamp-2">
                    {typeof proposal.alertas_conflictos[0] === 'object'
                      ? proposal.alertas_conflictos[0].fuente_texto || proposal.alertas_conflictos[0].descripcion
                      : 'Prioridad de verdad aplicada sobre el texto.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Sin contradicciones críticas entre notas y fotos.</span>
              </div>
            )}
          </div>
          {conflictsCount > 1 && (
            <button
              type="button"
              onClick={() => setActiveTab('conflictos')}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 mt-2 text-left cursor-pointer"
            >
              Ver las {conflictsCount} alertas →
            </button>
          )}
        </div>

        {/* Card 2: Gaps Detectados */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center justify-between">
              <span>Gaps Detectados</span>
              <span className="font-mono text-indigo-600 font-bold">{suggestionsCount}</span>
            </h3>
            {suggestionsCount > 0 ? (
              <ul className="text-xs space-y-2">
                {proposal.sugerencias_proactivas.slice(0, 2).map((gap: any, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-slate-700">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0"></span>
                    <span className="line-clamp-2 text-xs leading-relaxed">
                      {typeof gap === 'string' ? gap : (
                        <>
                          <strong>{gap.titulo}:</strong> {gap.descripcion}
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic p-2">Sin gaps omitidos detectados.</p>
            )}
          </div>
          {suggestionsCount > 2 && (
            <button
              type="button"
              onClick={() => setActiveTab('sugerencias')}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 mt-2 text-left cursor-pointer"
            >
              Ver las {suggestionsCount} sugerencias →
            </button>
          )}
        </div>

        {/* Card 3: Extras Opcionales (0h) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center justify-between">
              <span>Extras Opcionales (0h)</span>
              <span className="font-mono text-slate-600 font-bold">{extrasCount}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mb-2">
              Detectados en bocetos pero excluidos del presupuesto base:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {extrasCount === 0 ? (
                <span className="text-xs text-slate-400 italic">No hay extras en imágenes.</span>
              ) : (
                proposal.extras_opcionales.map((extra: any, i: number) => (
                  <span
                    key={i}
                    className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[11px] font-bold border border-slate-200"
                  >
                    {typeof extra === 'string' ? extra : extra.titulo} (0h)
                  </span>
                ))
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('extras')}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 mt-2 text-left cursor-pointer"
          >
            Aislamiento de alcance →
          </button>
        </div>
      </div>

      {/* Resumen Ejecutivo Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            Resumen Ejecutivo para el Cliente
          </h3>
          <button
            type="button"
            onClick={() => handleCopy(proposal.resumen_ejecutivo, 'resumen')}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
          >
            {copiedText === 'resumen' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedText === 'resumen' ? 'Copiado' : 'Copiar Resumen'}</span>
          </button>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
          {proposal.resumen_ejecutivo}
        </p>
      </div>
      </>
      )}

      {/* Main Tabs Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50/70 p-1.5 gap-1">
          {/* Tab: Panel Gerencia (Default) */}
          <button
            type="button"
            id="tab-gerencia"
            onClick={() => setActiveTab('gerencia')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'gerencia'
                ? 'bg-slate-900 text-white shadow-xs border border-slate-800'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/70 font-semibold'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
            <span>Panel Gerencia</span>
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'gerencia' ? 'bg-indigo-500/40 text-indigo-200' : 'bg-indigo-100 text-indigo-800'
            }`}>
              Default
            </span>
          </button>

          <button
            type="button"
            id="tab-backlog"
            onClick={() => setActiveTab('backlog')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'backlog'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Hitos &amp; Backlog Técnico</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-bold">
              {totalHours}h
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('conflictos')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'conflictos'
                ? 'bg-white text-amber-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Alertas de Conflicto</span>
            {conflictsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                {conflictsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('extras')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'extras'
                ? 'bg-white text-purple-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Extras Opcionales (0h)</span>
            {extrasCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-800 font-bold">
                {extrasCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sugerencias')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'sugerencias'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sugerencias Proactivas</span>
            {suggestionsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                {suggestionsCount}
              </span>
            )}
          </button>

          {!isStakeholderView && (
            <button
              type="button"
              id="tab-exportar"
              onClick={() => setActiveTab('exportar')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'exportar'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Raw JSON &amp; Export (Admin)</span>
            </button>
          )}
        </div>

        {/* Tab 0: Panel de Resumen para la Gerencia (Predeterminado) */}
        {activeTab === 'gerencia' && (
          <div className="p-4 sm:p-6">
            <ExecutiveManagementPanel
              proposal={proposal}
              hourlyRate={hourlyRate}
              setHourlyRate={setHourlyRate}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          </div>
        )}

        {/* Tab 1: Backlog Técnico */}
        {activeTab === 'backlog' && (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Filters Bar & Actions */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar en tareas o hitos..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                {/* Role filter chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Rol:
                  </span>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      roleFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Todos ({totalHours}h)
                  </button>
                  {availableRoles.map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setRoleFilter(role)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        roleFilter.toLowerCase() === role.toLowerCase()
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {role} ({roleHoursMap[role]}h)
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick CSV Export inside Backlog Tab */}
              <button
                type="button"
                id="btn-download-hitos-csv-tab"
                onClick={() => exportHitosCsv(proposal)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors cursor-pointer shrink-0 shadow-xs"
                title="Descargar todos los hitos y tareas en archivo CSV compatible con Excel y Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Descargar Hitos (CSV)</span>
              </button>
            </div>

            {/* Milestones and Atomic Tasks */}
            <div className="space-y-4">
              {filteredHitos.map((hito, hIdx) => {
                const isCollapsed = collapsedHitos[hito.nombre_meta];
                const hitoHours = horasPorHito(hito);
                const hitoCompletedCount = hito.tareas.filter((t, i) => completedTasks[`${hIdx}-${i}`]).length;

                return (
                  <div
                    key={hito.nombre_meta || hIdx}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs"
                  >
                    {/* Milestone Header */}
                    <div
                      onClick={() => toggleHitoCollapse(hito.nombre_meta)}
                      className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        )}
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                          {hito.nombre_meta}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          ({hito.tareas.length} tareas)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hitoCompletedCount > 0 && (
                          <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {hitoCompletedCount}/{hito.tareas.length} listos
                          </span>
                        )}
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-lg">
                          {hitoHours}h
                        </span>
                      </div>
                    </div>

                    {/* Task List */}
                    {!isCollapsed && (
                      <div className="divide-y divide-slate-100">
                        {hito.tareas.map((tarea, tIdx) => {
                          const taskKey = `${hIdx}-${tIdx}`;
                          const isDone = completedTasks[taskKey];

                          return (
                            <div
                              key={taskKey}
                              className={`p-3.5 sm:p-4 flex items-start justify-between gap-3 hover:bg-slate-50/50 transition-colors ${
                                isDone ? 'bg-slate-50/80 opacity-60' : ''
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  type="button"
                                  onClick={() => toggleTaskCompletion(taskKey)}
                                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                                    isDone
                                      ? 'bg-emerald-600 border-emerald-600 text-white'
                                      : 'border-slate-300 hover:border-indigo-500 bg-white'
                                  }`}
                                >
                                  {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                                </button>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h5 className={`text-xs sm:text-sm font-semibold text-slate-900 ${isDone ? 'line-through text-slate-500' : ''}`}>
                                      {tarea.titulo}
                                    </h5>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getRoleColor(tarea.rol)}`}>
                                      {tarea.rol}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-700 font-sans leading-relaxed">
                                    {tarea.descripcion}
                                  </p>
                                </div>
                              </div>

                              {/* Hours pill */}
                              <div className="shrink-0 text-right">
                                <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">
                                  {tarea.horas}h
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Alertas de Conflicto */}
        {activeTab === 'conflictos' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <p className="font-semibold">Regla 5: Detección y Aislamiento de Conflictos</p>
                <p>
                  Si existe contradicción entre los bocetos adjuntos y las notas del usuario, la IA aplica <strong>Master Truth</strong> (las notas mandan) y te alerta aquí para validar con el cliente antes del kickoff.
                </p>
              </div>
            </div>

            {conflictsCount === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium">No se detectaron discrepancias entre las capturas y las notas.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {proposal.alertas_conflictos.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/30 space-y-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-200/80 text-amber-900">
                        Discrepancia #{idx + 1}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {typeof item === 'string' ? item : item.titulo}
                      </h4>
                    </div>

                    {typeof item === 'object' && (
                      <>
                        <p className="text-xs text-slate-700">{item.descripcion}</p>

                        <div className="grid sm:grid-cols-2 gap-2 text-xs pt-1">
                          {item.fuente_imagen && (
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                              <span className="font-semibold text-rose-600 block mb-0.5">Captura / Boceto:</span>
                              <span className="text-slate-600">{item.fuente_imagen}</span>
                            </div>
                          )}
                          {item.fuente_texto && (
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                              <span className="font-semibold text-emerald-600 block mb-0.5">Notas del Cliente (Master Truth):</span>
                              <span className="text-slate-600">{item.fuente_texto}</span>
                            </div>
                          )}
                        </div>

                        {item.recomendacion && (
                          <div className="text-xs bg-amber-100/60 p-2.5 rounded-lg border border-amber-200 text-amber-900">
                            <strong>Recomendación TPM:</strong> {item.recomendacion}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Extras Opcionales (0 Horas) */}
        {activeTab === 'extras' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="text-xs text-purple-900 space-y-1">
                <p className="font-semibold">Regla 2: Aislamiento de Alcance (Scope Creep Protection)</p>
                <p>
                  Funciones que estaban visibles en las capturas de pantalla pero que <strong>NO fueron pedidas en el texto</strong>. Se les asigna <strong>0 horas</strong> en el presupuesto base para proteger el presupuesto del cliente.
                </p>
              </div>
            </div>

            {extrasCount === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium">No se detectaron extras de scope en las imágenes.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {proposal.extras_opcionales.map((extra: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-purple-200/80 bg-purple-50/20 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-purple-600" />
                        {typeof extra === 'string' ? extra : extra.titulo}
                      </h4>
                      <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                        0 horas (Opcional)
                      </span>
                    </div>

                    {typeof extra === 'object' && (
                      <>
                        <p className="text-xs text-slate-600">{extra.descripcion}</p>
                        {extra.origen_detectado && (
                          <p className="text-[11px] text-purple-700 font-medium">
                            Origen: {extra.origen_detectado}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Sugerencias Proactivas */}
        {activeTab === 'sugerencias' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 space-y-1">
                <p className="font-semibold">Regla 4: Modo Consultor y Detección de Gaps</p>
                <p>
                  Procesos clave que el cliente u operador suele omitir en la etapa inicial (ej: anulaciones, confirmaciones por email, feriados, auditorías) y que un Senior TPM sugiere proactivamente.
                </p>
              </div>
            </div>

            {suggestionsCount === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium">No se generaron sugerencias proactivas adicionales.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {proposal.sugerencias_proactivas.map((sug: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Impacto {typeof sug === 'object' && sug.impacto ? sug.impacto : 'Recomendado'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">#{idx + 1}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      {typeof sug === 'string' ? sug : sug.titulo}
                    </h4>
                    {typeof sug === 'object' && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {sug.descripcion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Exportar & Raw JSON */}
        {activeTab === 'exportar' && (
          <div className="p-4 sm:p-6 space-y-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: Descargar Hitos como Excel (.xlsx) */}
              <button
                type="button"
                id="btn-export-hitos-xlsx-card"
                onClick={() => exportHitosXlsx(proposal)}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 group bg-white shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Descargar Hitos (Excel .xlsx)</h5>
                  <p className="text-[11px] text-slate-500">
                    Libro de Excel nativo con filas, columnas, títulos de cabecera en negrita y títulos de cada hito en negrita.
                  </p>
                </div>
              </button>

              {/* Card 2: Descargar JSON Puro */}
              <button
                type="button"
                id="btn-export-json-card"
                onClick={() => {
                  const slug = proyectoSlug(proposal.metadata?.proyecto, 'backlog');
                  downloadJsonFile(proposal, `propuesta_${slug}.json`);
                }}
                className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/20 text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 group bg-white shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <FileCode className="w-5 h-5 text-indigo-600" />
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Descargar JSON Puro</h5>
                  <p className="text-[11px] text-slate-500">
                    Estructura pura del Senior TPM solicitada en las instrucciones.
                  </p>
                </div>
              </button>

              {/* Card 3: Exportar a Jira / CSV */}
              <button
                type="button"
                id="btn-export-jira-card"
                onClick={() => exportToJiraCsv(proposal)}
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 group bg-white shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Exportar a Jira / CSV</h5>
                  <p className="text-[11px] text-slate-500">
                    Importación directa como historias de usuario con estimaciones.
                  </p>
                </div>
              </button>

              {/* Card 4: Copiar en Markdown */}
              <button
                type="button"
                id="btn-export-markdown-card"
                onClick={() => {
                  const md = generateMarkdownExport(proposal);
                  handleCopy(md, 'markdown');
                }}
                className="p-4 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/20 text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 group bg-white shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <Copy className="w-5 h-5 text-purple-600" />
                  {copiedText === 'markdown' ? <Check className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">
                    {copiedText === 'markdown' ? '¡Copiado en Markdown!' : 'Copiar en Markdown'}
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    Ideal para Notion, Linear, GitHub Issues o README de proyecto.
                  </p>
                </div>
              </button>
            </div>

            {/* Raw JSON Terminal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Visualizador de JSON Estructurado
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(proposal, null, 2), 'raw-json')}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 cursor-pointer"
                >
                  {copiedText === 'raw-json' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText === 'raw-json' ? 'Copiado al portapapeles' : 'Copiar JSON'}</span>
                </button>
              </div>
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#1E1E1E] shadow-xl">
                {/* Terminal Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#252526] border-b border-white/5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                    <span className="text-[11px] font-mono text-slate-400 ml-2">architect_proposal.json</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-300 bg-indigo-950/60 border border-indigo-800/40 px-2 py-0.5 rounded">
                    Strict JSON
                  </span>
                </div>
                <pre className="text-slate-200 p-4 text-xs font-mono overflow-x-auto max-h-[420px] leading-relaxed select-text">
                  <code>{JSON.stringify(proposal, null, 2)}</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
