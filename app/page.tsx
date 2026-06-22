'use client';

import * as React from 'react';

import { 
  Cpu, 
  Layers, 
  Scissors, 
  Settings, 
  ClipboardCheck, 
  Users, 
  Wrench, 
  Binary, 
  Printer, 
  Flame, 
  Home, 
  Award, 
  CheckCircle2, 
  ShieldAlert, 
  Trash2,
  BookmarkCheck,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Info
} from 'lucide-react';

import { 
  Lead, 
  getLeads, 
  addLead, 
  removeLead, 
  isFirebaseActive, 
  clearLocalLeads 
} from '../lib/dbService';

// =========================================================================
// CONFIGURAÇÃO DE IMAGENS DO PROJETO:
// As imagens locais são importadas no topo deste arquivo:
// - meu-cad-desenho.png
// - modulo-fisico.jpg
// =========================================================================

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    alert('Erro capturado: ' + event.message + '\nArquivo: ' + event.filename + '\nLinha: ' + event.lineno + '\nErro: ' + String(event.error));
  });
  window.addEventListener('unhandledrejection', (event) => {
    alert('Rejeição não tratada: ' + String(event.reason) + '\nStack: ' + (event.reason?.stack || 'Sem stack'));
  });
}

const DEFAULT_LEADS: Lead[] = [
  {
    id: 'lead-1',
    name: 'Ana Júlia Silva',
    email: 'anajulia.silva@discente.ufg.br',
    phone: '(62) 98112-4455',
    affiliation: 'Estudante UFG',
    timestamp: '16/06/2026 10:15',
    equipment: 'Creality K1 Max',
  },
  {
    id: 'lead-2',
    name: 'Prof. Carlos Eduardo',
    email: 'carloseduardo@ufg.br',
    phone: '(62) 99223-1100',
    affiliation: 'Servidor/Docente UFG',
    timestamp: '16/06/2026 09:30',
    equipment: 'Duplotech 1080',
  }
];

export default function Page() {
  const [leads, setLeads] = React.useState<Lead[]>(DEFAULT_LEADS);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [affiliation, setAffiliation] = React.useState('Estudante UFG');
  const [selectedEquipment, setSelectedEquipment] = React.useState('Creality K1 Max');
  const [submitSuccess, setSubmitSuccess] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('inicio');
  const [selectedSpec, setSelectedSpec] = React.useState<'k1' | 'duplotech'>('k1');
  const [dbConnected, setDbConnected] = React.useState(false);

  // Simulador de Custos - MDF e Laser
  const [mdfWidth, setMdfWidth] = React.useState<number>(32);
  const [mdfHeight, setMdfHeight] = React.useState<number>(32);
  const [mdfPricePerM2, setMdfPricePerM2] = React.useState<number>(95);

  const [laserCutTime, setLaserCutTime] = React.useState<number | ''>('');
  const [laserCutPricePerMin, setLaserCutPricePerMin] = React.useState<number>(2.5);

  const [laserEngraveTime, setLaserEngraveTime] = React.useState<number | ''>('');
  const [laserEngravePricePerMin, setLaserEngravePricePerMin] = React.useState<number>(2.5);

  // Simulador de Custos - Impressão 3D
  const [printMaterial, setPrintMaterial] = React.useState<'PLA' | 'PETG' | 'ABS'>('PLA');
  const [printPrinter, setPrintPrinter] = React.useState<'K1' | 'K1_MAX'>('K1_MAX');
  const [printHours, setPrintHours] = React.useState<number | ''>('');
  const [printMinutes, setPrintMinutes] = React.useState<number | ''>('');
  const [filamentMetres, setFilamentMetres] = React.useState<number | ''>('');
  const [printQuantity, setPrintQuantity] = React.useState<number>(1);
  const [projectType, setProjectType] = React.useState<'ENSINO' | 'PESQUISA'>('ENSINO');
  const [currentSlide, setCurrentSlide] = React.useState<number>(0);

  // Cálculos de Custos Dinâmicos - Impressão 3D e Laser/MDF
  const mdfArea = (mdfWidth / 100) * (mdfHeight / 100);
  const mdfCost = mdfArea * mdfPricePerM2;

  const laserCutCost = (laserCutTime === '' ? 0 : laserCutTime) * laserCutPricePerMin;
  const laserEngraveCost = (laserEngraveTime === '' ? 0 : laserEngraveTime) * laserEngravePricePerMin;

  // Constantes da Planilha
  const DIAMETER_3D = 1.75; // mm
  const FILAMENT_PRICE_PER_KG = 110; // R$
  const KWH_PRICE_3D = 0.4859; // R$
  const MACHINE_POWER_3D = 220; // Watts
  const FAILURE_RATE_3D = 0.15; // 15%
  const ADMIN_RATE_3D = 3.00; // R$

  const MACHINE_VALUES_3D = {
    K1: 5500,
    K1_MAX: 6000
  };

  const MATERIAL_DENSITIES_3D = {
    ABS: 1.04,
    PLA: 1.24,
    PETG: 1.27
  };

  // Tempo total de impressão
  const totalPrintHours = (printHours === '' ? 0 : printHours) + (printMinutes === '' ? 0 : printMinutes) / 60;
  const metersVal = filamentMetres === '' ? 0 : filamentMetres;

  // Cálculo físico do peso em gramas
  const lengthMm = metersVal * 1000;
  const radiusMm = DIAMETER_3D / 2;
  const areaMm2 = Math.PI * Math.pow(radiusMm, 2);
  const volumeCm3 = (areaMm2 * lengthMm) / 1000;
  const density = MATERIAL_DENSITIES_3D[printMaterial];
  const weightGrams = volumeCm3 * density;

  // Custo de Filamento
  const printFilamentCost = weightGrams * (FILAMENT_PRICE_PER_KG / 1000);

  // Custo de Energia
  const printEnergyCost = (MACHINE_POWER_3D / 1000) * totalPrintHours * KWH_PRICE_3D;

  // Custo de ROI/Depreciação
  const machineValue = MACHINE_VALUES_3D[printPrinter];
  const roiHours = 12 * 20 * 8; // 1920 horas (12 meses, 20 dias, 8 horas)
  const roiRatePerHour = machineValue / roiHours;
  const printRoiCost = roiRatePerHour * totalPrintHours;

  // Custo Administrativo (1 hora de setup + horas de impressão)
  const printAdminCost = ADMIN_RATE_3D * (1 + totalPrintHours);

  // Fórmula de Produção da Planilha:
  // Custo = Filamento + (Energia + Depreciação) * 1.15 (falha) * 1.20 (indiretos) + Custo Administrativo
  const printProductionCostRaw = printFilamentCost + (printEnergyCost + printRoiCost) * (1 + FAILURE_RATE_3D) * 1.20 + printAdminCost;

  // Custo por peça (com desconto para pesquisa de 50%, se aplicável)
  const printCostPerPiece = printProductionCostRaw * (projectType === 'PESQUISA' ? 0.5 : 1.0);
  const totalPrintCost = printCostPerPiece * printQuantity;

  const estimatedTotalCost = mdfCost + laserCutCost + laserEngraveCost + totalPrintCost;

  const handleResetSimulation = () => {
    setMdfWidth(32);
    setMdfHeight(32);
    setMdfPricePerM2(95);
    setLaserCutTime('');
    setLaserCutPricePerMin(2.5);
    setLaserEngraveTime('');
    setLaserEngravePricePerMin(2.5);
    setPrintMaterial('PLA');
    setPrintPrinter('K1_MAX');
    setPrintHours('');
    setPrintMinutes('');
    setFilamentMetres('');
    setPrintQuantity(1);
    setProjectType('ENSINO');
  };

  // Load leads and check connection on client mount
  React.useEffect(() => {
    const loadLeadsData = async () => {
      const active = isFirebaseActive();
      setDbConnected(active);
      const data = await getLeads();
      setLeads(data);
    };
    loadLeadsData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) return;

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      name,
      email,
      phone,
      affiliation,
      timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }).substring(0, 16),
      equipment: selectedEquipment
    };

    try {
      await addLead(newLead);
      const data = await getLeads();
      setLeads(data);

      // Reset form & show feedback
      setName('');
      setEmail('');
      setPhone('');
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);

      // Scroll to visualization of leads or top
      const logSection = document.getElementById('registered-leads');
      if (logSection) {
        logSection.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Erro ao adicionar inscrição:', err);
    }
  };

  const handleRemoveLead = async (id: string) => {
    try {
      await removeLead(id);
      const data = await getLeads();
      setLeads(data);
    } catch (err) {
      console.error('Erro ao remover inscrição:', err);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="tech-mesh min-h-screen relative pb-16 md:pb-0" id="top">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-[#131313]/90 backdrop-blur-md border-b border-[#454655]/20 h-20 px-4 md:px-10">
        <div className="max-w-7xl mx-auto h-full flex justify-between items-center">
          <div 
            onClick={() => scrollToSection('top')} 
            className="font-display text-2xl tracking-tighter text-[#bcc2ff] font-bold cursor-pointer hover:text-white transition-all flex items-center gap-3"
          >
            <img 
              src="/logo-ipelab.png" 
              alt="Logo IPElab UFG" 
              className="h-8 w-auto object-contain"
            />
            <span>ESTEIRA TECH</span>
          </div>
          
          <div className="hidden md:flex gap-8 items-center font-mono">
            <button 
              onClick={() => scrollToSection('processo')} 
              className="text-[#c5c5d7] hover:text-[#bcc2ff] font-medium text-sm transition-colors duration-200"
            >
              Processo
            </button>
            <button 
              onClick={() => scrollToSection('maquinas-maker')} 
              className="text-[#c5c5d7] hover:text-[#bcc2ff] font-medium text-sm transition-colors duration-200"
            >
              Tecnologia & Máquinas
            </button>
            <button 
              onClick={() => scrollToSection('ipelab-apresentacao')} 
              className="text-[#c5c5d7] hover:text-[#bcc2ff] font-medium text-sm transition-colors duration-200"
            >
              IPELab
            </button>
            <button 
              onClick={() => scrollToSection('galeria')} 
              className="text-[#c5c5d7] hover:text-[#bcc2ff] font-medium text-sm transition-colors duration-200"
            >
              Galeria
            </button>
            <button 
              onClick={() => scrollToSection('simulador-custos')} 
              className="text-[#c5c5d7] hover:text-[#bcc2ff] font-medium text-sm transition-colors duration-200"
            >
              Simulador
            </button>
            <button 
              onClick={() => scrollToSection('inscricao')} 
              className="text-[#b5835a] hover:text-white font-medium text-sm transition-colors duration-200 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#b5835a]" />
              Inscrição Oficina
            </button>
          </div>

          <button 
            onClick={() => scrollToSection('inscricao')}
            className="bg-[#2e41d1] text-white hover:bg-[#3a4cdb] px-6 py-2.5 font-mono text-xs font-bold tracking-wider active:scale-95 transition-transform border border-[#bcc2ff]/10 uppercase"
            id="nav-encomendar"
          >
            ENCOMENDAR / PARTICIPAR
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative min-h-[95vh] flex flex-col pt-24 pb-16 px-4 md:px-10 overflow-hidden border-b border-[#454655]/30">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/50 to-transparent z-10"></div>
          <img 
            alt="High-tech industrial laser and 3D printing oficina setup at IPElab" 
            className="absolute inset-0 w-full h-full object-cover grayscale contrast-125 brightness-[0.4]" 
            src="https://lh3.googleusercontent.com/aida/AP1WRLvcEPYVo7dCSYLvMJmBypNLIXhzPM3O-EnmhEFjs7qGf8hJqq_CKsUrkzu6oCUrmcVV0rripzoz96eGLWRv_zFvyElVR3hJ4T-ybao23HSH7bAQ-06y92qHcNKnrHKGBYKyAvkhp5u_cq3dgiwmPLipf7L31QZ8P_O6I-brDSFRrS0-ePd9mM6pivzrUiSZ-7Zyn0sUa4lXDBTsinHDhfITO8BU8bFjVXiqAI-SCgQlRPmcjBj-1-osfEyf"
          />
          <div className="scanline"></div>
        </div>

        {/* IPELab Presentation Section inside the Hero */}
        <div className="relative z-20 max-w-7xl mx-auto w-full mb-12" id="ipelab-apresentacao">
          <div className="border-b border-[#454655]/30 pb-4 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <span className="font-mono text-[#b5835a] text-xs font-bold tracking-widest uppercase text-left">EXPLORE O ECOSSISTEMA</span>
              <h2 className="font-display text-2xl md:text-3xl text-white font-black uppercase mt-1 tracking-tight text-left">
                Apresentação do IPELab
              </h2>
            </div>
            <p className="font-mono text-[11px] text-[#8f8fa0] max-w-md md:text-right leading-relaxed">
              O Laboratório de Ideação, Prototipagem e Empreendedorismo da UFG. Conheça nossas unidades, espaços e tecnologias de fabricação digital.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Slide Image Container */}
            <div className="lg:col-span-8 bg-[#131313]/85 backdrop-blur-md border border-[#454655]/30 p-4 hard-shadow-mdf glow-mdf relative flex flex-col justify-center min-h-[350px] group">
              <div className="absolute top-4 left-4 bg-[#b5835a] text-black font-mono text-[9px] font-bold px-2 py-0.5 uppercase z-20">
                {([
                  'Boas-Vindas',
                  'Infraestrutura',
                  'Tecnologia'
                ] as const)[currentSlide]}
              </div>
              <div className="absolute top-4 right-4 bg-[#131313]/90 border border-[#454655]/30 text-white font-mono text-[10px] px-2 py-0.5 z-20">
                {currentSlide + 1} / 3
              </div>

              {/* Main Image */}
              <div className="relative w-full overflow-hidden flex-grow flex items-center justify-center bg-[#131313]/30 min-h-[300px]">
                <img 
                  alt={
                    currentSlide === 0 ? 'Sejam Bem-vindos ao IPELab!' :
                    currentSlide === 1 ? 'Unidades do IPELab' :
                    'Espaços e Equipamentos'
                  } 
                  className="max-w-full max-h-[380px] object-contain transition-all duration-500 transform hover:scale-[1.01]" 
                  src={
                    currentSlide === 0 ? '/ipelab-welcome.jpg' :
                    currentSlide === 1 ? '/ipelab-units.png' :
                    '/ipelab-spaces.png'
                  }
                />
              </div>

              {/* Navigation Arrows */}
              <button
                type="button"
                onClick={() => setCurrentSlide((prev) => (prev === 0 ? 2 : prev - 1))}
                className="absolute left-6 top-1/2 -translate-y-1/2 bg-[#0e0e0e]/80 hover:bg-[#b5835a] hover:text-black text-[#b5835a] border border-[#b5835a]/30 p-2 transition-all duration-300 cursor-pointer active:scale-95 group-hover:opacity-100 opacity-80 z-20"
                aria-label="Slide anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentSlide((prev) => (prev === 2 ? 0 : prev + 1))}
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-[#0e0e0e]/80 hover:bg-[#b5835a] hover:text-black text-[#b5835a] border border-[#b5835a]/30 p-2 transition-all duration-300 cursor-pointer active:scale-95 group-hover:opacity-100 opacity-80 z-20"
                aria-label="Próximo slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Slide Information Panel */}
            <div className="lg:col-span-4 bg-[#131313]/85 backdrop-blur-md border border-[#454655]/30 p-6 flex flex-col justify-between space-y-6 hard-shadow-yellow glow-yellow">
              <div className="space-y-4">
                <div className="flex items-center gap-2 font-mono text-[9px] text-[#b5835a]">
                  <span className="w-1.5 h-1.5 bg-[#b5835a] rounded-full animate-ping"></span>
                  <span>APRESENTAÇÃO VIRTUAL</span>
                </div>
                
                <h3 className="font-display text-xl text-white font-extrabold uppercase tracking-tight leading-tight">
                  {currentSlide === 0 ? 'Sejam Bem-vindos ao IPELab!' :
                   currentSlide === 1 ? 'Unidades do IPELab' :
                   'Espaços e Equipamentos'}
                </h3>
                
                <p className="font-mono text-xs text-[#c5c5d7] leading-relaxed border-l-2 border-[#b5835a] pl-4 py-1">
                  {currentSlide === 0 ? 'O IPELab (Laboratório de Ideação, Prototipagem e Empreendedorismo) da UFG é um espaço maker aberto a estudantes, pesquisadores e à comunidade para transformar ideias em projetos reais por meio de tecnologias de fabricação digital.' :
                   currentSlide === 1 ? 'Com presença multicampi, o IPELab possui unidades distribuídas estrategicamente na Sede (Parque Tecnológico Samambaia), Engenharias (Campus Colemar), Agronomia, Física, Goiás e FCT (Aparecida de Goiânia).' :
                   'Equipado com o que há de mais moderno em prototipagem: impressoras 3D de filamento e resina, cortadoras a laser, fresadoras CNC, scanners 3D, óculos de realidade virtual (VR), canetas 3D, drones e câmeras 360°.'}
                </p>
              </div>

              {/* Dots / Indicators and Auto Slide Control */}
              <div className="space-y-3 pt-4 border-t border-[#454655]/20">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[9px] text-[#8f8fa0] uppercase tracking-wider">Selecionar Slide</span>
                  <div className="flex gap-2">
                    {[0, 1, 2].map((idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentSlide(idx)}
                        className={`w-2 h-2 transition-all duration-300 cursor-pointer rounded-none ${
                          currentSlide === idx 
                            ? 'bg-[#b5835a] w-5' 
                            : 'bg-[#454655] hover:bg-[#b5835a]/50'
                        }`}
                        aria-label={`Ir para slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-[9px] font-mono text-[#8f8fa0] leading-normal">
                  * Utilize os botões laterais da imagem ou clique nos indicadores acima para navegar.
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="relative z-20 max-w-4xl mx-auto w-full mt-auto">
          <div className="inline-flex items-center gap-2 bg-[#b5835a] text-white font-mono text-xs px-4 py-1.5 mb-6 milled-edge uppercase tracking-wider font-bold">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
            PRECISION FABRICATION v2.4 | IPELAB UFG
          </div>
          
          <h1 className="font-display text-4xl md:text-6xl text-[#ffffff] mb-6 uppercase tracking-tight font-extrabold leading-[1.1]">
            Engenharia de Conforto:<br />
            <span className="text-[#bcc2ff]">A Nova Era Esteira Tech</span>
          </h1>
          
          <p className="font-mono text-sm md:text-base text-[#c5c5d7] mb-10 max-w-2xl border-l-[3px] border-[#b5835a] pl-5 leading-relaxed">
            Unindo a excelência do <span className="text-[#ffffff] font-bold">IPElab UFG</span> em fabricação digital com design industrial sofisticado para projetar e fabricar acessórios premium com acabamento em <span className="text-[#b5835a] font-bold">MDF Cru</span> e polímeros de alta velocidade <span className="text-white">Branco ABS</span>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mt-8">
            <button 
              onClick={() => scrollToSection('processo')}
              className="w-full bg-[#2e41d1] hover:bg-[#3a4cdb] text-white py-4 px-6 font-mono font-bold tracking-wider text-center milled-edge active:scale-[0.98] transition-all uppercase text-sm border border-[#bcc2ff]/20 cursor-pointer shadow-md shadow-[#2e41d1]/10"
            >
              VER PROCESSO MAKER
            </button>
            <button 
              onClick={() => scrollToSection('maquinas-maker')}
              className="w-full border-2 border-[#b5835a] text-[#b5835a] hover:bg-[#b5835a] hover:text-white py-[14px] px-6 font-mono font-bold tracking-wider text-center active:scale-[0.98] transition-all uppercase text-sm cursor-pointer shadow-md shadow-[#b5835a]/10"
            >
              EXPLORAR MATERIAIS & MAQUINÁRIO
            </button>
          </div>
        </div>
      </header>

      {/* Info Warning banner indicating active oficina */}
      <section className="bg-[#b5835a]/10 border-b border-[#b5835a]/30 py-4 px-4 font-mono text-center">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-3 text-[#e5e2e1] text-xs md:text-sm">
          <Info className="w-5 h-5 text-[#b5835a] flex-shrink-0" />
          <span>🚀 <strong className="text-white font-bold">Inscrições Abertas:</strong> Próxima turma de fabricação digital com as super impressoras <strong className="text-white">Creality K1</strong> e corte laser <strong className="text-white">Duplotech 1080</strong> no IPElab da UFG campus Samambaia!</span>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-20 px-4 md:px-10 bg-[#0e0e0e]" id="processo">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 border-b border-[#454655]/20 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-[#d5cb00] font-bold">PIPINES DE TECNOLOGIA</span>
              <h2 className="font-display text-3xl md:text-4xl text-white font-bold uppercase mt-1 tracking-tight">
                INFRAESTRUTURA TÉCNICA
              </h2>
            </div>
            <div className="w-24 h-1 bg-[#d5cb00]"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Fusion 360 */}
            <div className="bg-[#131313] border border-[#454655]/30 p-6 hard-shadow-blue glow-blue flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-[#2e41d1]/20 border border-[#2e41d1]/50">
                    <Cpu className="text-[#bcc2ff] w-8 h-8" />
                  </div>
                  <span className="font-mono text-[10px] text-[#8f8fa0] bg-[#1c1b1b] px-2 py-1 border border-[#454655]/20">SYS.ID: F360-MOD</span>
                </div>
                <h3 className="font-display text-xl text-white font-bold mb-3 uppercase tracking-tight">Fusion 360</h3>
                <p className="font-mono text-xs text-[#c5c5d7] leading-relaxed mb-4">
                  Modelagem paramétrica tridimensional. Garantia de tolerâncias milimétricas de precisão mecânica, preparação de vetores DXF e planificação de polias para montagem de encaixes sob medida.
                </p>
              </div>
              <div className="font-mono text-[11px] text-[#bcc2ff] border-t border-[#454655]/20 pt-3 flex items-center gap-1.5 mt-4">
                <span className="w-2 h-2 bg-[#2e41d1] animate-pulse"></span>
                Exportação CNC Integrada
              </div>
            </div>

            {/* Card 2: Impressão 3D */}
            <div className="bg-[#131313] border border-[#454655]/30 p-6 hard-shadow-yellow glow-yellow flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-[#b8af00]/20 border border-[#b8af00]/50">
                    <Layers className="text-[#d5cb00] w-8 h-8" />
                  </div>
                  <span className="font-mono text-[10px] text-[#8f8fa0] bg-[#1c1b1b] px-2 py-1 border border-[#454655]/20">PRT-3DX: INS</span>
                </div>
                <h3 className="font-display text-xl text-white font-bold mb-3 uppercase tracking-tight">Impressão 3D</h3>
                <p className="font-mono text-xs text-[#c5c5d7] leading-relaxed mb-4">
                  Fabricação em polímero termoplástico termorresistente de alta rigidez estrutural. Prototipagem com suporte para polímero <strong className="text-white">Branco ABS</strong> de filamento e PLA Premium, validando ergonomias perfeitas.
                </p>
              </div>
              <div className="font-mono text-[11px] text-[#d5cb00] border-t border-[#454655]/20 pt-3 flex items-center gap-1.5 mt-4">
                <span className="w-2 h-2 bg-[#b8af00] animate-pulse"></span>
                Câmaras de Alta Velocidade (600mm/s)
              </div>
            </div>

            {/* Card 3: Corte Laser */}
            <div className="bg-[#131313] border border-[#454655]/30 p-6 hard-shadow-red glow-red flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-[#bf031c]/20 border border-[#bf031c]/50">
                    <Scissors className="text-[#ffb3ad] w-8 h-8" />
                  </div>
                  <span className="font-mono text-[10px] text-[#8f8fa0] bg-[#1c1b1b] px-2 py-1 border border-[#454655]/20">SYS.ID: LSR-CUT</span>
                </div>
                <h3 className="font-display text-xl text-white font-bold mb-3 uppercase tracking-tight">Corte Laser</h3>
                <p className="font-mono text-xs text-[#c5c5d7] leading-relaxed mb-4">
                  Corte por laser de CO₂ com controle focal e corte vetorial. Execução direta com chapas rígidas de <strong className="text-[#b5835a]">MDF Cru (#b5835a)</strong> e acrílico fosco, com acabamento de queima controlada de bordas.
                </p>
              </div>
              <div className="font-mono text-[11px] text-[#ffb3ad] border-t border-[#454655]/20 pt-3 flex items-center gap-1.5 mt-4">
                <span className="w-2 h-2 bg-[#bf031c] animate-pulse"></span>
                Corte Milimétrico Duplotech
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Equipment Spotlight Section (Equipamentos em Destaque) */}
      <section className="py-20 px-4 md:px-10 bg-[#131313] border-y border-[#454655]/20" id="maquinas-maker">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#b5835a] text-xs font-mono font-bold tracking-widest uppercase">MÁQUINAS DO LABORATÓRIO IPELAB UFG</span>
            <h2 className="font-display text-3xl md:text-5xl text-white font-black uppercase mt-2 tracking-tight">
              SUPERAR LIMITES COM A FORÇA MAKER
            </h2>
            <p className="font-mono text-xs md:text-sm text-[#c5c5d7] mt-4 leading-relaxed">
              O IPElab é dotado de ferramentaria de ponta mundial da UFG. No oficina, usaremos ativamente os seguintes equipamentos para usinar e polimerizar sua Esteira Tech física:
            </p>
          </div>

          {/* Interactive tabs selection */}
          <div className="flex flex-wrap justify-center mb-10 gap-4">
            <button
              onClick={() => setSelectedSpec('k1')}
              className={`px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider border-2 transition-all duration-300 cursor-pointer ${
                selectedSpec === 'k1'
                  ? 'bg-[#b8af00] text-[#0e0e0e] border-[#b8af00] shadow-lg shadow-[#b8af00]/20'
                  : 'bg-transparent text-[#d5cb00] border-[#b8af00]/40 hover:border-[#b8af00] hover:bg-[#b8af00]/5'
              }`}
            >
              🚀 Creality K1 & K1 Max (Impressão 3D)
            </button>
            <button
              onClick={() => setSelectedSpec('duplotech')}
              className={`px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider border-2 transition-all duration-300 cursor-pointer ${
                selectedSpec === 'duplotech'
                  ? 'bg-[#bf031c] text-white border-[#bf031c] shadow-lg shadow-[#bf031c]/20'
                  : 'bg-transparent text-[#ffb3ad] border-[#bf031c]/40 hover:border-[#bf031c] hover:bg-[#bf031c]/5'
              }`}
            >
              🔥 Duplotech 1080 (Corte Laser)
            </button>
          </div>

          <div className="relative min-h-[460px] flex items-stretch">
            {selectedSpec === 'k1' ? (
              <div className="w-full bg-[#0e0e0e] border-2 border-[#b8af00]/40 p-8 glow-yellow transition-all duration-500 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#454655]/20 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#b8af00]/10 border border-[#b8af00] flex items-center justify-center flex-shrink-0">
                        <Printer className="w-6 h-6 text-[#d5cb00]" />
                      </div>
                      <div>
                        <h3 className="font-display text-xl text-white font-bold leading-tight uppercase">Creality K1 & K1 Max</h3>
                        <p className="font-mono text-[10px] text-[#d5cb00]">IMPRESSÃO 3D INDUSTRIAL FDM</p>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#b8af00]/10 border border-[#b8af00]/30 text-[#d5cb00] font-mono text-[10px] font-bold self-start sm:self-center">
                      <span className="w-1.5 h-1.5 bg-[#d5cb00] rounded-full animate-ping"></span>
                      OPERACIONAL | IPELAB UFG
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4 font-mono text-xs text-[#c5c5d7]">
                      <h4 className="text-white font-bold uppercase text-xs tracking-wider mb-2 border-b border-[#454655]/10 pb-1">Desempenho Técnico</h4>
                      <div>
                        <div className="flex justify-between mb-1.5 text-[10px]">
                          <span>VELOCIDADE MÁXIMA DE IMPRESSÃO</span>
                          <span className="text-white font-bold">600 mm/s (12x rápida)</span>
                        </div>
                        <div className="w-full bg-[#131313] h-2 border border-[#454655]/30">
                          <div className="bg-[#d5cb00] h-full transition-all duration-500" style={{ width: '95%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1.5 text-[10px]">
                          <span>ACELERAÇÃO CINEMÁTICA</span>
                          <span className="text-white font-bold">20000 mm/s²</span>
                        </div>
                        <div className="w-full bg-[#131313] h-2 border border-[#454655]/30">
                          <div className="bg-[#d5cb00] h-full transition-all duration-500" style={{ width: '90%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1.5 text-[10px]">
                          <span>VOLUME DE IMPRESSÃO (MAX)</span>
                          <span className="text-white font-bold">300 x 300 x 300 mm</span>
                        </div>
                        <div className="w-full bg-[#131313] h-2 border border-[#454655]/30">
                          <div className="bg-[#d5cb00] h-full transition-all duration-500" style={{ width: '85%' }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 font-mono text-xs">
                      <h4 className="text-white font-bold uppercase text-xs tracking-wider mb-2 border-b border-[#454655]/10 pb-1">Especificações Maker</h4>
                      <div className="p-3 bg-[#131313] border border-[#454655]/20">
                        <span className="text-[#8f8fa0] block text-[9px]">MATERIAIS DO OFICINA:</span>
                        <span className="text-[#bcc2ff] font-bold text-xs">Filamento Branco ABS, PETG e PLA Premium</span>
                      </div>
                      <div className="p-3 bg-[#131313] border border-[#454655]/20">
                        <span className="text-[#8f8fa0] block text-[9px]">SISTEMA DE NIVELAMENTO:</span>
                        <span className="text-white font-bold text-xs">Autonivelamento Hands-free (Sensores de deformação)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[#c5c5d7] leading-relaxed text-xs pt-6 border-t border-[#454655]/20 mt-6 font-mono">
                  A Creality K1 revoluciona a velocidade de fabricação com seu sistema cinemático CoreXY de baixo peso e nivelamento hands-free por sensores de deformação (strain gauge). No oficina, utilizaremos para fabricar o berço modular de suporte (porta copos).
                </p>
              </div>
            ) : (
              <div className="w-full bg-[#0e0e0e] border-2 border-[#bf031c]/40 p-8 glow-red transition-all duration-500 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#454655]/20 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#bf031c]/10 border border-[#bf031c] flex items-center justify-center flex-shrink-0">
                        <Flame className="w-6 h-6 text-[#ffb3ad]" />
                      </div>
                      <div>
                        <h3 className="font-display text-xl text-white font-bold leading-tight uppercase">Duplotech 1080 Laser</h3>
                        <p className="font-mono text-[10px] text-[#ffb3ad]">MÁQUINA DE CORTE E GRAVAÇÃO CO₂</p>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#bf031c]/10 border border-[#bf031c]/30 text-[#ffb3ad] font-mono text-[10px] font-bold self-start sm:self-center">
                      <span className="w-1.5 h-1.5 bg-[#bf031c] rounded-full animate-ping"></span>
                      OPERACIONAL | IPELAB UFG
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4 font-mono text-xs text-[#c5c5d7]">
                      <h4 className="text-white font-bold uppercase text-xs tracking-wider mb-2 border-b border-[#454655]/10 pb-1">Desempenho Técnico</h4>
                      <div>
                        <div className="flex justify-between mb-1.5 text-[10px]">
                          <span>POTÊNCIA DO LASER CO₂</span>
                          <span className="text-white font-bold">100W Contínuo</span>
                        </div>
                        <div className="w-full bg-[#131313] h-2 border border-[#454655]/30">
                          <div className="bg-[#bf031c] h-full transition-all duration-500" style={{ width: '90%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1.5 text-[10px]">
                          <span>ÁREA ÚTIL DE TRABALHO</span>
                          <span className="text-white font-bold">1000 x 800 mm</span>
                        </div>
                        <div className="w-full bg-[#131313] h-2 border border-[#454655]/30">
                          <div className="bg-[#bf031c] h-full transition-all duration-500" style={{ width: '95%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1.5 text-[10px]">
                          <span>VELOCIDADE DE USINAGEM</span>
                          <span className="text-white font-bold">Até 60.000 mm/min</span>
                        </div>
                        <div className="w-full bg-[#131313] h-2 border border-[#454655]/30">
                          <div className="bg-[#bf031c] h-full transition-all duration-500" style={{ width: '80%' }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 font-mono text-xs">
                      <h4 className="text-white font-bold uppercase text-xs tracking-wider mb-2 border-b border-[#454655]/10 pb-1">Especificações Maker</h4>
                      <div className="p-3 bg-[#131313] border border-[#454655]/20">
                        <span className="text-[#8f8fa0] block text-[9px]">MATERIAIS PRINCIPAIS:</span>
                        <span className="text-[#b5835a] font-bold text-xs">MDF Cru (#b5835a) de 3 a 6mm e Acrílicos</span>
                      </div>
                      <div className="p-3 bg-[#131313] border border-[#454655]/20">
                        <span className="text-[#8f8fa0] block text-[9px]">SISTEMA DE RESFRIAMENTO:</span>
                        <span className="text-white font-bold text-xs">Chiller CW5000 a Água Industrial</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[#c5c5d7] leading-relaxed text-xs pt-6 border-t border-[#454655]/20 mt-6 font-mono">
                  A Duplotech 1080 oferece alta estabilidade para cortes complexos e gravação profunda. Com exaustores integrados e ponta focal resfriada a água (chiller CW5000), ela fura e modela o chassi estrutural da esteira com velocidade industrial e fixações precisas.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CAD Showcase Section (Excelência Prototipada) */}
      <section className="py-20 px-4 md:px-10 bg-[#0e0e0e]" id="galeria">
        <div className="max-w-7xl mx-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Column 1: Text Info */}
            <div className="space-y-8">
              <div>
                <span className="font-mono text-xs uppercase text-[#bcc2ff] tracking-widest font-bold">PRECISÃO VIRTUAL</span>
                <h2 className="font-display text-4xl text-white font-extrabold uppercase mt-1 leading-tight tracking-tight">
                  EXCELÊNCIA<br />
                  <span className="text-[#bcc2ff]">PROTOTIPADA</span>
                </h2>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-5 bg-[#131313] border-l-4 border-[#2e41d1] border border-[#454655]/10 hover:border-[#2e41d1]/30 transition-all duration-300">
                  <div className="w-10 h-10 bg-[#2e41d1]/10 rounded-none flex items-center justify-center flex-shrink-0 border border-[#2e41d1]/30">
                    <Award className="text-[#bcc2ff] w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Qualidade IPElab UFG</h4>
                    <p className="font-mono text-xs text-[#c5c5d7] mt-1.5 leading-relaxed">
                      Acesso aos laboratórios de criatividade da UFG. Orientado por técnicos e engenheiros.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 bg-[#131313] border-l-4 border-[#b5835a] border border-[#454655]/10 hover:border-[#b5835a]/30 transition-all duration-300">
                  <div className="w-10 h-10 bg-[#b5835a]/10 rounded-none flex items-center justify-center flex-shrink-0 border border-[#b5835a]/30">
                    <Settings className="text-[#b5835a] w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Design Adaptativo & Robusto</h4>
                    <p className="font-mono text-xs text-[#c5c5d7] mt-1.5 leading-relaxed">
                      Sistemas paramétricos modulares em CAD 3D que se adaptam exatamente às dimensões solicitadas para seu projeto funcional da Esteira Tech.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: CAD Image Frame */}
            <div className="relative p-2 bg-[#131313] border border-[#454655]/40 hard-shadow-mdf glow-mdf transition-all duration-300">
              <div className="absolute -top-1 -left-1 w-12 h-12 border-t-2 border-l-2 border-[#b5835a] pointer-events-none z-20"></div>
              <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-2 border-r-2 border-[#b5835a] pointer-events-none z-20"></div>
              
              <div className="relative w-full bg-[#0e0e0e] flex items-center justify-center">
                <img 
                  alt="Fusion 360 virtual design schema model for Esteira Tech" 
                  className="w-full h-auto object-cover grayscale contrast-[1.3] brightness-90 filter" 
                  src="/meu-cad-desenho.png"
                />
              </div>
              
              <div className="p-3 bg-[#0e0e0e] border-t border-[#454655]/30">
                <p className="font-mono text-[10px] text-[#8f8fa0] text-center">
                  PROTOTIPAGEM DE ENCAIXE NO FUSION 360 (PLANIFICADO PARA CORTE A LASER DUPLOTECH)
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Physical Integration Section */}
      <section className="py-20 px-4 md:px-10 bg-[#131313] border-t border-[#454655]/20">
        <div className="max-w-7xl mx-auto">
          <div className="border-b border-[#454655]/30 pb-4 mb-12">
            <span className="font-mono text-[#bcc2ff] text-xs font-bold tracking-widest uppercase">CICLO DE DESENVOLVIMENTO MAKER</span>
            <h2 className="font-display text-2xl md:text-4xl text-white font-bold uppercase">
              A Jornada Maker: <span className="text-[#b5835a]">Do Rascunho à Realidade</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Infographic: From Sketch to Product */}
            <div className="lg:col-span-7 bg-[#0e0e0e] border border-[#454655]/40 p-3 hard-shadow-mdf glow-mdf relative transition-all duration-300 h-full flex flex-col justify-between">
              <div className="absolute top-2 left-2 bg-[#b5835a] text-black font-mono text-[9px] font-bold px-2 py-0.5 uppercase z-20">
                Ciclo Maker
              </div>
              <div className="relative w-full bg-[#131313] overflow-hidden flex-grow flex items-center justify-center">
                <img 
                  alt="Ciclo completo de desenvolvimento: do rascunho à mão livre ao modelo CAD e produto físico acabado" 
                  className="w-full h-auto object-contain hover:scale-[1.01] transition-transform duration-500" 
                  src="/de-rascunho-a-produto.jpg"
                />
              </div>
              <div className="p-3 bg-[#131313] border-t border-[#454655]/20 mt-2 font-mono text-[10px] text-[#8f8fa0] text-center">
                JORNADA COMPLETA: CONCEPÇÃO ➔ VETORIZAÇÃO DIGITAL ➔ IMPRESSÃO & CORTE LASER
              </div>
            </div>

            {/* Inspiration and Physical Integration Close-up */}
            <div className="lg:col-span-5 flex flex-col justify-between h-full gap-6">
              <div className="space-y-4">
                <span className="font-mono text-xs uppercase text-[#b5835a] tracking-widest font-bold">TIRANDO IDEIAS DO PAPEL</span>
                <h3 className="font-display text-2xl md:text-3xl text-white font-extrabold uppercase leading-tight tracking-tight">
                  SAIA DO RASCUNHO,<br />
                  <span className="text-[#b5835a]">TORNE REAL</span>
                </h3>
                <p className="font-mono text-xs text-[#c5c5d7] leading-relaxed">
                  Não deixe suas inovações e esboços restritos ao caderno. A proposta do oficina da <strong>Esteira Tech</strong> no <strong>IPElab UFG</strong> é justamente guiar você em cada etapa técnica para materializar produtos físicos sofisticados e funcionais.
                </p>
                <div className="p-4 bg-[#131313] border border-[#454655]/20 font-mono text-[11px] text-[#e5e2e1] space-y-2">
                  <div className="flex items-center gap-2 text-[#b5835a]">
                    <span className="w-1.5 h-1.5 bg-[#b5835a] rounded-full"></span>
                    <span><strong>1. Idealização:</strong> Esboce e dimensione</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#bcc2ff]">
                    <span className="w-1.5 h-1.5 bg-[#bcc2ff] rounded-full"></span>
                    <span><strong>2. Modelagem:</strong> Vetorize e encaixe no CAD 3D</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#ffb3ad]">
                    <span className="w-1.5 h-1.5 bg-[#ffb3ad] rounded-full"></span>
                    <span><strong>3. Materialização:</strong> Corte, polimerize e monte</span>
                  </div>
                </div>
              </div>

              <div className="relative p-2 bg-[#0e0e0e] border border-[#454655]/40 hard-shadow-red glow-red mt-4 sm:mt-0">
                <div className="relative w-full h-[220px] bg-[#131313] flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-[#bf031c]/5 mix-blend-overlay z-10 pointer-events-none"></div>
                  <img 
                    alt="Módulos circulares físicos impressos em 3D com logotipos da UFG e IPElab" 
                    className="w-full h-full object-cover" 
                    src="/modulo-fisico.jpg"
                  />
                </div>
                <div className="p-3 bg-[#131313] border-t border-[#454655]/20 mt-2 font-mono text-[10px] text-[#c5c5d7] italic">
                  &ldquo;A ponte mecânica entre o modelo virtual e a peça física final é onde a engenharia de precisão ganha vida.&rdquo;
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cost Simulator Section */}
      <section className="py-20 px-4 md:px-10 bg-[#131313] border-t border-[#454655]/20" id="simulador-custos">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-[#b5835a] text-xs font-mono font-bold tracking-widest uppercase">PLANEJAMENTO FINANCEIRO MAKER</span>
            <h2 className="font-display text-3xl md:text-5xl text-white font-black uppercase mt-2 tracking-tight">
              Simulador de Custos de Material
            </h2>
            <p className="font-mono text-xs md:text-sm text-[#c5c5d7] mt-4 leading-relaxed">
              Calcule dinamicamente o custo aproximado de fabricação das suas peças estruturais de MDF e partes impressas em 3D.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* COLUMN 1: MDF & LASER CUTTING */}
            <div className="p-8 bg-[#0e0e0e] border border-[#454655]/30 hard-shadow-mdf glow-mdf flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-6 border-b border-[#454655]/20 pb-4">
                  <Layers className="text-[#b5835a] w-5 h-5" />
                  <h3 className="font-display text-lg text-white font-bold uppercase tracking-tight">
                    Estrutura & Usinagem Laser
                  </h3>
                </div>

                {/* MDF Sheet Component */}
                <div className="p-5 bg-[#131313] border border-[#454655]/20 mb-6 rounded-none">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Chapa de MDF (3mm)</h4>
                    <span className="font-mono text-xs text-[#b5835a] bg-[#b5835a]/10 px-2.5 py-1 font-bold border border-[#b5835a]/20">
                      Custo: R$ {mdfCost.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 font-mono text-[10px]">
                    <div>
                      <label className="block text-[#8f8fa0] uppercase tracking-wider mb-1">Largura (CM)</label>
                      <input 
                        type="number"
                        min="0"
                        value={mdfWidth}
                        onChange={(e) => setMdfWidth(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-[#0e0e0e] border border-[#454655]/50 px-3 py-2 text-white font-mono focus:outline-none focus:border-[#b5835a]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8f8fa0] uppercase tracking-wider mb-1">Altura (CM)</label>
                      <input 
                        type="number"
                        min="0"
                        value={mdfHeight}
                        onChange={(e) => setMdfHeight(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-[#0e0e0e] border border-[#454655]/50 px-3 py-2 text-white font-mono focus:outline-none focus:border-[#b5835a]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8f8fa0] uppercase tracking-wider mb-1">Preço (M²)</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-[#8f8fa0]">R$</span>
                        <input 
                          type="number"
                          min="0"
                          value={mdfPricePerM2}
                          onChange={(e) => setMdfPricePerM2(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-[#0e0e0e] border border-[#454655]/50 pl-7 pr-2 py-2 text-white font-mono focus:outline-none focus:border-[#b5835a]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Laser Cutting Component */}
                <div className="p-5 bg-[#131313] border border-[#454655]/20 mb-6 rounded-none">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Máquina (Corte)</h4>
                    <span className="font-mono text-xs text-[#bcc2ff] bg-[#2e41d1]/10 px-2.5 py-1 font-bold border border-[#bcc2ff]/10">
                      Custo: R$ {laserCutCost.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 font-mono text-[10px]">
                    <div>
                      <label className="block text-[#8f8fa0] uppercase tracking-wider mb-1">Tempo (MIN)</label>
                      <input 
                        type="number"
                        min="0"
                        placeholder="min"
                        value={laserCutTime}
                        onChange={(e) => setLaserCutTime(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                        className="w-full bg-[#0e0e0e] border border-[#454655]/50 px-3 py-2 text-white font-mono focus:outline-none focus:border-[#bcc2ff]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8f8fa0] uppercase tracking-wider mb-1">Valor/MIN</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-[#8f8fa0]">R$</span>
                        <input 
                          type="number"
                          min="0"
                          step="0.1"
                          value={laserCutPricePerMin}
                          onChange={(e) => setLaserCutPricePerMin(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-[#0e0e0e] border border-[#454655]/50 pl-7 pr-2 py-2 text-white font-mono focus:outline-none focus:border-[#bcc2ff]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Laser Engraving Component */}
                <div className="p-5 bg-[#131313] border border-[#454655]/20 rounded-none">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Máquina (Gravação)</h4>
                    <span className="font-mono text-xs text-[#bcc2ff] bg-[#2e41d1]/10 px-2.5 py-1 font-bold border border-[#bcc2ff]/10">
                      Custo: R$ {laserEngraveCost.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 font-mono text-[10px]">
                    <div>
                      <label className="block text-[#8f8fa0] uppercase tracking-wider mb-1">Tempo (MIN)</label>
                      <input 
                        type="number"
                        min="0"
                        placeholder="min"
                        value={laserEngraveTime}
                        onChange={(e) => setLaserEngraveTime(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                        className="w-full bg-[#0e0e0e] border border-[#454655]/50 px-3 py-2 text-white font-mono focus:outline-none focus:border-[#bcc2ff]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8f8fa0] uppercase tracking-wider mb-1">Valor/MIN</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-[#8f8fa0]">R$</span>
                        <input 
                          type="number"
                          min="0"
                          step="0.1"
                          value={laserEngravePricePerMin}
                          onChange={(e) => setLaserEngravePricePerMin(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-[#0e0e0e] border border-[#454655]/50 pl-7 pr-2 py-2 text-white font-mono focus:outline-none focus:border-[#bcc2ff]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2: 3D PRINTING */}
            <div className="p-8 bg-[#0e0e0e] border border-[#454655]/30 hard-shadow-yellow glow-yellow flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-6 border-b border-[#454655]/20 pb-4">
                  <Printer className="text-[#d5cb00] w-5 h-5" />
                  <h3 className="font-display text-lg text-white font-bold uppercase tracking-tight">
                    Polímero Impressão 3D
                  </h3>
                </div>

                {/* Material Selector & Printer Selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Material / Polymer Selector */}
                  <div className="p-4 bg-[#131313] border border-[#454655]/20 rounded-none">
                    <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider mb-2.5">Material / Polímero</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {(['ABS', 'PLA', 'PETG'] as const).map((mat) => (
                        <button
                          key={mat}
                          type="button"
                          onClick={() => setPrintMaterial(mat)}
                          className={`py-2 text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                            printMaterial === mat
                              ? 'bg-[#b8af00] text-black border-[#b8af00]'
                              : 'bg-transparent text-[#d5cb00] border-[#b8af00]/40 hover:border-[#b8af00]'
                          }`}
                        >
                          {mat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Printer / Machine Selector */}
                  <div className="p-4 bg-[#131313] border border-[#454655]/20 rounded-none">
                    <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider mb-2.5">Impressora (ROI)</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {(['K1', 'K1_MAX'] as const).map((printer) => (
                        <button
                          key={printer}
                          type="button"
                          onClick={() => setPrintPrinter(printer)}
                          className={`py-2 text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                            printPrinter === printer
                              ? 'bg-[#b8af00] text-black border-[#b8af00]'
                              : 'bg-transparent text-[#d5cb00] border-[#b8af00]/40 hover:border-[#b8af00]'
                          }`}
                        >
                          {printer === 'K1' ? 'Creality K1' : 'K1 Max'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3D Printer Inputs */}
                <div className="p-5 bg-[#131313] border border-[#454655]/20 rounded-none space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                      Tempo & Consumo
                    </h4>
                    <span className="font-mono text-xs text-[#d5cb00] bg-[#b8af00]/10 px-2.5 py-1 font-bold border border-[#b8af00]/20">
                      Custo Total: R$ {totalPrintCost.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 font-mono text-[10px]">
                    <div>
                      <label className="block text-[#8f8fa0] uppercase tracking-wider mb-1">Horas de Impressão</label>
                      <div className="relative">
                        <input 
                          type="number"
                          min="0"
                          placeholder="0"
                          value={printHours}
                          onChange={(e) => setPrintHours(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                          className="w-full bg-[#0e0e0e] border border-[#454655]/50 px-3 py-2 text-white font-mono focus:outline-none focus:border-[#b8af00]"
                        />
                        <span className="absolute right-2.5 top-2 text-[#8f8fa0] text-[9px]">h</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[#8f8fa0] uppercase tracking-wider mb-1">Minutos de Impressão</label>
                      <div className="relative">
                        <input 
                          type="number"
                          min="0"
                          max="59"
                          placeholder="0"
                          value={printMinutes}
                          onChange={(e) => setPrintMinutes(e.target.value === '' ? '' : Math.max(0, Math.min(59, Number(e.target.value))))}
                          className="w-full bg-[#0e0e0e] border border-[#454655]/50 px-3 py-2 text-white font-mono focus:outline-none focus:border-[#b8af00]"
                        />
                        <span className="absolute right-2.5 top-2 text-[#8f8fa0] text-[9px]">min</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#8f8fa0] uppercase tracking-wider mb-1">
                        Consumo (Metros)
                      </label>
                      <div className="relative">
                        <input 
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0"
                          value={filamentMetres}
                          onChange={(e) => setFilamentMetres(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                          className="w-full bg-[#0e0e0e] border border-[#454655]/50 pr-7 pl-3 py-2 text-white font-mono focus:outline-none focus:border-[#b8af00]"
                        />
                        <span className="absolute right-2.5 top-2 text-[#8f8fa0] text-[9px]">
                          m
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[9px] text-[#8f8fa0] font-mono leading-tight">
                    Fórmula Planilha: Insumo (Peso em gramas) + (Energia + Depreciação ROI) * 1.15 * 1.20 + Admin (1h setup + tempo). Diária: R$ 3,00/h.
                  </div>

                  <div className="grid grid-cols-2 gap-4 font-mono text-[10px] pt-2 border-t border-[#454655]/10">
                    <div>
                      <label className="block text-[#8f8fa0] uppercase tracking-wider mb-1">Quantidade de Peças</label>
                      <input 
                        type="number"
                        min="1"
                        value={printQuantity}
                        onChange={(e) => setPrintQuantity(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-[#0e0e0e] border border-[#454655]/50 px-3 py-2 text-white font-mono focus:outline-none focus:border-[#b8af00]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[#8f8fa0] uppercase tracking-wider mb-1">Tipo de Projeto</label>
                      <select
                        value={projectType}
                        onChange={(e) => setProjectType(e.target.value as 'ENSINO' | 'PESQUISA')}
                        className="w-full bg-[#0e0e0e] border border-[#454655]/50 px-3 py-2 text-white font-mono focus:outline-none focus:border-[#b8af00]"
                      >
                        <option value="ENSINO">Ensino / Extensão</option>
                        <option value="PESQUISA">Pesquisa (50% Desc.)</option>
                      </select>
                    </div>
                  </div>

                  {/* Quebra Detalhada de Custos (Conforme Planilha) */}
                  <div className="mt-4 p-4 bg-[#0e0e0e] border border-[#454655]/20 font-mono text-[10px] space-y-2">
                    <div className="flex justify-between text-[#8f8fa0] border-b border-[#454655]/10 pb-1">
                      <span>Custo de Filamento ({weightGrams.toFixed(1)}g):</span>
                      <span className="text-white">R$ {printFilamentCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#8f8fa0] border-b border-[#454655]/10 pb-1">
                      <span>Energia (c/ Falha/Indiretos):</span>
                      <span className="text-white">R$ {(printEnergyCost * 1.15 * 1.20).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#8f8fa0] border-b border-[#454655]/10 pb-1">
                      <span>Depreciação Máquina (ROI c/ Falha/Indiretos):</span>
                      <span className="text-white">R$ {(printRoiCost * 1.15 * 1.20).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#8f8fa0] border-b border-[#454655]/10 pb-1">
                      <span>Custo Administrativo (Setup+Tempo):</span>
                      <span className="text-white">R$ {printAdminCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#d5cb00] font-bold border-b border-[#454655]/20 pb-1 pt-1">
                      <span>VALOR DE PRODUÇÃO {projectType === 'PESQUISA' ? '(Pesquisa -50%)' : '(Peça)'}:</span>
                      <span>R$ {printCostPerPiece.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#00ffcc] font-bold border-b border-[#454655]/20 pb-1">
                      <span>VALOR DE VENDA SUGERIDO:</span>
                      <span>R$ {(printCostPerPiece * 2).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#ff9900] font-bold">
                      <span>LUCRO ESTIMADO (100%):</span>
                      <span>R$ {printCostPerPiece.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* GRAND TOTAL ESTIMATION PANEL */}
          <div className="max-w-6xl mx-auto mt-8 p-6 bg-[#0e0e0e] border border-[#454655]/40 flex flex-col md:flex-row justify-between items-center gap-4 glow-mdf border-[#b5835a]/20">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#b5835a]/10 border border-[#b5835a]/30">
                <Binary className="text-[#b5835a] w-6 h-6" />
              </div>
              <div>
                <h4 className="font-display text-white font-bold uppercase text-sm tracking-wider">Custo Total Estimado</h4>
                <p className="font-mono text-xs text-[#8f8fa0] mt-0.5">Soma da estrutura, usinagem laser e polimerização 3D</p>
              </div>
            </div>
            <div className="flex items-center gap-6 self-stretch md:self-auto justify-between md:justify-end w-full md:w-auto">
              <button
                type="button"
                onClick={handleResetSimulation}
                className="px-4 py-2 border border-[#454655]/40 hover:border-[#b5835a] hover:text-[#b5835a] text-[10px] font-mono font-bold text-[#8f8fa0] uppercase tracking-wider transition-all duration-300 cursor-pointer active:scale-95 bg-[#131313]/50"
              >
                Limpar Simulação
              </button>
              <div className="font-display text-2xl md:text-3xl text-[#b5835a] font-black tracking-tight border-b-2 border-[#b5835a] pb-1">
                R$ {estimatedTotalCost.toFixed(2)}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Oficina Registration / Capture Form (Formulário de Captura) */}
      <section className="py-20 px-4 md:px-10 bg-[#0e0e0e] relative" id="inscricao">
        <div className="max-w-6xl mx-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Form Side */}
            <div className="h-full">
              <div className="p-8 bg-[#131313] border-2 border-[#b5835a] hard-shadow-mdf glow-mdf h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-[#b5835a]/10 flex items-center justify-center border border-[#b5835a]/30">
                      <ClipboardCheck className="text-[#b5835a] w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg text-white font-extrabold uppercase tracking-tight">
                        Oficina Esteira Tech
                      </h3>
                      <p className="font-mono text-[10px] text-[#b5835a]">IPELAB UFG CAMPUS CO-WORKING</p>
                    </div>
                  </div>

                  <p className="font-mono text-xs text-[#c5c5d7] mb-6 leading-relaxed">
                    Inscreva-se abaixo para reservar sua vaga individual gratuita no laboratório e obter certificação oficial da Universidade Federal de Goiás.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs" id="leads-form">
                    <div>
                      <label className="block text-[#e5e2e1] uppercase tracking-wider mb-1.5 font-bold">
                        Nome Completo *
                      </label>
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Marcelo Silva Santos"
                        className="w-full bg-[#0e0e0e] border border-[#454655]/50 px-4 py-3 text-white focus:outline-none focus:border-[#b5835a] transition-all font-mono placeholder-[#8f8fa0]"
                        id="form-name"
                      />
                    </div>

                    <div>
                      <label className="block text-[#e5e2e1] uppercase tracking-wider mb-1.5 font-bold">
                        E-mail *
                      </label>
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Ex: marcelosilva@discente.ufg.br"
                        className="w-full bg-[#0e0e0e] border border-[#454655]/50 px-4 py-3 text-white focus:outline-none focus:border-[#b5835a] transition-all font-mono placeholder-[#8f8fa0]"
                        id="form-email"
                      />
                    </div>

                    <div>
                      <label className="block text-[#e5e2e1] uppercase tracking-wider mb-1.5 font-bold">
                        Telefone / WhatsApp *
                      </label>
                      <input 
                        type="tel" 
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ex: (62) 99999-8888"
                        className="w-full bg-[#0e0e0e] border border-[#454655]/50 px-4 py-3 text-white focus:outline-none focus:border-[#b5835a] transition-all font-mono placeholder-[#8f8fa0]"
                        id="form-phone"
                      />
                    </div>

                    <div>
                      <label className="block text-[#e5e2e1] uppercase tracking-wider mb-1.5 font-bold">
                        Vínculo com a UFG *
                      </label>
                      <select 
                        required
                        value={affiliation}
                        onChange={(e) => setAffiliation(e.target.value)}
                        className="w-full bg-[#0e0e0e] border border-[#454655]/50 px-4 py-3 text-white focus:outline-none focus:border-[#b5835a] transition-all font-mono"
                        id="form-affiliation"
                      >
                        <option value="Estudante UFG">Estudante UFG (Graduação/Pós)</option>
                        <option value="Servidor/Docente UFG">Servidor Técnico ou Docente UFG</option>
                        <option value="Comunidade Externa">Comunidade Externa / Maker Autônomo</option>
                        <option value="Parceiro IPElab">Parceiro Corporativo ou Patrocinador</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#e5e2e1] uppercase tracking-wider mb-1.5 font-bold">
                        Foco de Interesse / Equipamento Principal *
                      </label>
                      <select 
                        required
                        value={selectedEquipment}
                        onChange={(e) => setSelectedEquipment(e.target.value)}
                        className="w-full bg-[#0e0e0e] border border-[#454655]/50 px-4 py-3 text-white focus:outline-none focus:border-[#b5835a] transition-all font-mono"
                        id="form-equipment"
                      >
                        <option value="Creality K1 Max">Creality K1 (Impressão 3D Ultrarrápida FDM)</option>
                        <option value="Duplotech 1080">Duplotech 1080 (Corte Laser CO2 - MDF Cru / Acrílicos)</option>
                        <option value="Fusion 360 CAD">Modelagem Paramétrica Fusion 360</option>
                        <option value="Ambos Equipamentos">Quero dominar todas as ferramentas!</option>
                      </select>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-[#b5835a] text-white py-4 px-6 font-bold tracking-wider font-mono hover:bg-[#c39167] active:scale-[0.99] transition-all uppercase text-center border border-[#ffffff]/10 mt-6 cursor-pointer"
                      id="form-submit-btn"
                    >
                      SOLICITAR MATRÍCULA NO OFICINA
                    </button>
                  </form>
                </div>

                {submitSuccess && (
                  <div className="mt-4 p-4 bg-[#2e41d1]/20 border border-[#2e41d1] text-white font-mono text-xs flex items-start gap-2 animate-fade-in" id="success-alert">
                    <CheckCircle2 className="w-5 h-5 text-[#bcc2ff] flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-white uppercase font-bold">SOLICITAÇÃO RECEBIDA COM SUCESSO!</strong>
                      Sua reserva foi gerada e gravada no sistema. Verifique a lista ao lado para confirmar os detalhes do credenciamento.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Visualization and Local Storage Dashboard Side */}
            <div className="h-full" id="registered-leads">
              <div className="p-8 bg-[#131313] border border-[#454655]/30 hard-shadow-blue glow-blue h-full flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-6 border-b border-[#454655]/20 pb-4">
                    <div className="flex items-center gap-2">
                      <Users className="text-[#bcc2ff] w-5 h-5" />
                      <h3 className="font-display text-lg text-white font-bold uppercase tracking-tight">
                        CANDIDATOS INSCRITOS ({leads.length})
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#0e0e0e] px-2.5 py-1 border border-[#454655]/30">
                      <span className={`w-1.5 h-1.5 rounded-full ${dbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#e5e2e1]">
                        {dbConnected ? 'Firebase' : 'Local'}
                      </span>
                    </div>
                  </div>

                  <p className="font-mono text-xs text-[#c5c5d7] mb-6 leading-relaxed">
                    Aqui estão carregados em tempo real os e-mails e contatos das solicitações. Os dados são persistidos no <strong className="text-white">{dbConnected ? 'Firebase Firestore' : 'localStorage'}</strong>.
                  </p>

                  <div className="space-y-3 font-mono text-xs max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                    {leads.length === 0 ? (
                      <div className="p-6 bg-[#0e0e0e] border border-[#454655]/20 text-center text-[#8f8fa0]">
                        Nenhuma inscrição registrada ainda. Preencha o formulário para testar a persistência!
                      </div>
                    ) : (
                      leads.map((lead) => (
                        <div 
                          key={lead.id} 
                          className="p-4 bg-[#0e0e0e] border border-[#454655]/30 relative group hover:border-[#b5835a] transition-all"
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-[#b5835a] font-bold mb-1">
                            <BookmarkCheck className="w-3 h-3" />
                            <span>{lead.affiliation.toUpperCase()}</span>
                            <span className="text-[#454655]">•</span>
                            <span className="text-[#8f8fa0] font-normal">{lead.timestamp}</span>
                          </div>

                          <h4 className="text-white font-bold text-sm mb-1">{lead.name}</h4>
                          <p className="text-[#8f8fa0] text-[11px] mb-1.5">{lead.email} | {lead.phone}</p>
                          
                          <div className="inline-block px-2.5 py-1 bg-[#131313] border border-[#454655]/50 text-[#bcc2ff] text-[10px] font-bold">
                            Foco: {lead.equipment}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Meet the Lab CTA Section */}
      <section className="py-24 px-4 text-center bg-[#131313] border-t border-[#454655]/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-[#bcc2ff] rotate-45"></div>
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl text-white font-extrabold uppercase mb-6 tracking-tight">
            Crie Conosco no IPElab
          </h2>
          <p className="font-mono text-sm text-[#c5c5d7] mb-10 leading-relaxed">
            Transforme suas ideias em realidade e venha fazer parte de um ecossistema de ponta voltado para a engenharia de precisão e para o espírito maker. O IPElab UFG está de portas abertas.
          </p>
          <button 
            onClick={() => scrollToSection('inscricao')}
            className="bg-[#d5cb00] text-black font-mono font-bold tracking-widest uppercase py-4 px-12 text-sm hard-shadow-yellow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            id="main-know-lab-btn"
          >
            CONHECER O LAB & MATRICULAR-SE
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-[#0e0e0e] border-t border-[#454655]/30 py-12 px-4 md:px-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 border-b border-[#454655]/20 pb-8 mb-8">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-3">
              <img 
                src="/logo-ipelab.png" 
                alt="Logo IPElab UFG" 
                className="h-7 w-auto object-contain"
              />
              <span className="font-display text-2xl tracking-tighter text-[#bcc2ff] font-bold">ESTEIRA TECH</span>
            </div>
            <span className="font-mono text-[9px] text-[#b5835a] uppercase tracking-widest mt-1.5">Selo de Qualidade IPElab UFG</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 font-mono text-[10px] uppercase tracking-widest">
            <a href="#" className="text-[#8f8fa0] hover:text-[#bcc2ff] transition-colors">Termos de Uso</a>
            <a href="#" className="text-[#8f8fa0] hover:text-[#bcc2ff] transition-colors">Privacidade</a>
            <a href="#" className="text-[#8f8fa0] hover:text-[#bcc2ff] transition-colors">Documentação Técnica</a>
            <a href="#" className="text-[#8f8fa0] hover:text-[#bcc2ff] transition-colors">UFG.br</a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-[10px] uppercase tracking-widest text-[#8f8fa0]">
          <div>
            © 2026 ESTEIRA TECH FAB LAB. TODOS OS DIREITOS RESERVADOS. <span className="text-[#bcc2ff]">PRECISION ENGINEERED.</span>
          </div>
          <div>
            CRAFTED FOR <span className="text-[#b5835a]">IPELAB UFG</span>
          </div>
        </div>
      </footer>

      {/* Bottom Navigation (Mobile Only Shell Requirement) */}
      <div className="fixed bottom-0 left-0 w-full bg-[#131313]/95 backdrop-blur-xl border-t border-[#454655]/30 md:hidden z-50 flex justify-around items-center h-16 px-4">
        <button 
          onClick={() => { setActiveTab('inicio'); scrollToSection('top'); }}
          className={`flex flex-col items-center gap-1 font-mono transition-colors ${activeTab === 'inicio' ? 'text-[#bcc2ff]' : 'text-[#8f8fa0]'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase">INÍCIO</span>
        </button>
        <button 
          onClick={() => { setActiveTab('lab'); scrollToSection('maquinas-maker'); }}
          className={`flex flex-col items-center gap-1 font-mono transition-colors ${activeTab === 'lab' ? 'text-[#bcc2ff]' : 'text-[#8f8fa0]'}`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase">MÁQUINAS</span>
        </button>
        <button 
          onClick={() => { setActiveTab('pecas'); scrollToSection('galeria'); }}
          className={`flex flex-col items-center gap-1 font-mono transition-colors ${activeTab === 'pecas' ? 'text-[#bcc2ff]' : 'text-[#8f8fa0]'}`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase">PROCESSO</span>
        </button>
        <button 
          onClick={() => { setActiveTab('simulador'); scrollToSection('simulador-custos'); }}
          className={`flex flex-col items-center gap-1 font-mono transition-colors ${activeTab === 'simulador' ? 'text-[#bcc2ff]' : 'text-[#8f8fa0]'}`}
        >
          <Wrench className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase">SIMULADOR</span>
        </button>
        <button 
          onClick={() => { setActiveTab('suporte'); scrollToSection('inscricao'); }}
          className={`flex flex-col items-center gap-1 font-mono transition-colors ${activeTab === 'suporte' ? 'text-[#bcc2ff]' : 'text-[#8f8fa0]'}`}
        >
          <ClipboardCheck className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase">INSCRIÇÃO</span>
        </button>
      </div>
    </div>
  );
}
