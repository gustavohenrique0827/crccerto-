import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight, 
  LayoutDashboard, 
  Target, 
  UserCircle, 
  Calendar, 
  Activity, 
  CheckSquare, 
  BarChart3, 
  Building2, 
  Users, 
  Link2, 
  Settings, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  ExternalLink, 
  FileText, 
  PhoneCall, 
  MessageSquare, 
  Clock, 
  Key, 
  Check, 
  Copy, 
  Lightbulb, 
  Zap, 
  BookOpen,
  Filter,
  Eye,
  Sliders,
  Play,
  Layers,
  Database,
  RefreshCw,
  FolderSync,
  UserCheck,
  Shield,
  HeartHandshake,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';
import { Role } from '@/src/types';

export type GuideRoleProfile = 'super_admin' | 'clinic_admin' | 'crc_operator';

export interface GuideStep {
  id: string;
  category: 'WORKSPACE' | 'CRM' | 'OPERACOES' | 'RELATORIOS' | 'ADMIN' | 'CONFIG';
  categoryLabel: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  targetTab: string;
  targetTabLabel: string;
  badgeColor: string;
  overview: string;
  actionSteps: {
    title: string;
    description: string;
  }[];
  interactiveHighlights: {
    label: string;
    detail: string;
    tag?: string;
  }[];
  proTips: string[];
  shortcuts?: string[];
}

// 1. GUIA PARA O SUPER ADMIN (RODRIGO / GESTÃO DA REDE / AGÊNCIA)
const SUPER_ADMIN_STEPS: GuideStep[] = [
  {
    id: 'dashboard-super',
    category: 'WORKSPACE',
    categoryLabel: 'Workspace Global',
    title: 'Dashboard: Visão da Rede & Monitoramento Multi-Unidades',
    subtitle: 'Acompanhe métricas consolidadas de todas as clínicas clientes, volume de leads e faturamento em tempo real.',
    icon: LayoutDashboard,
    targetTab: 'dashboard',
    targetTabLabel: 'Abrir Dashboard',
    badgeColor: 'bg-blue-600 text-white',
    overview: 'Como Super Administrador (visão Rodrigo), o Dashboard permite alternar entre a visão de qualquer clínica parceira ou a "Rede Consolidada", que soma todos os indicadores para acompanhamento executivo.',
    actionSteps: [
      {
        title: '1. Acompanhar os Quadrados de Ação Rápida no Topo',
        description: 'Visualize os totais de confirmações de hoje, agendamentos pendentes de todas as unidades e faltas de ontem para auditoria da operação.'
      },
      {
        title: '2. Alternar entre Rede Consolidada e Clínicas Específicas',
        description: 'Utilize o seletor no topo da barra lateral para inspecionar métricas individuais de cada cliente parceiro.'
      },
      {
        title: '3. Análise de Canais de Captação e Origem',
        description: 'Monitore quais campanhas de tráfego pago (Meta Ads, Google) estão gerando mais leads e agendamentos nas filiais.'
      },
      {
        title: '4. Central de Resolução Rápida',
        description: 'Abra o modal de resolução para identificar gargalos de atendimento e tarefas atrasadas na operação.'
      }
    ],
    interactiveHighlights: [
      { label: 'Rede Consolidada', detail: 'Soma em tempo real do faturamento e leads de todas as clínicas', tag: 'Global' },
      { label: 'Hoje Confirm.', detail: 'Total de atendimentos garantidos na data atual', tag: 'Ocupação' },
      { label: 'Hoje Pend.', detail: 'Leads aguardando confirmação pelas secretárias', tag: 'Ação CRC' },
      { label: 'Ontem (Faltas)', detail: 'Pacientes faltantes prontos para régua de recuperação', tag: 'No-Show' }
    ],
    proTips: [
      'Compare a taxa de conversão entre clínicas diferentes para identificar as melhores práticas da rede.',
      'O Dashboard atualiza dados em tempo real através do banco de dados Supabase.'
    ],
    shortcuts: ['Ctrl + D : Atalho direto ao Dashboard', 'Filtros rápidos de Hoje, Ontem, 7d e 30d']
  },
  {
    id: 'multi-clinicas-super',
    category: 'WORKSPACE',
    categoryLabel: 'Multi-Tenancy',
    title: 'Gestão de Clientes, Clínicas & Módulos Habilitados',
    subtitle: 'Cadastre novos clientes da plataforma, gerencie dados contratuais e ative módulos sob medida.',
    icon: Building2,
    targetTab: 'clinicas',
    targetTabLabel: 'Gerenciar Clínicas',
    badgeColor: 'bg-indigo-600 text-white',
    overview: 'Gerencie todo o ecossistema de clínicas parceiras. Cada cliente possui seu próprio espaço isolado (multi-tenant), permitindo personalizar quais módulos ficam visíveis para a equipe daquela clínica.',
    actionSteps: [
      {
        title: '1. Cadastrar Novo Cliente / Clínica',
        description: 'Clique em "+ Novo Cliente / Clínica" na aba de Clínicas e preencha Razão Social, CNPJ, WhatsApp Oficial e Responsável.'
      },
      {
        title: '2. Criar Acesso do Administrador da Clínica',
        description: 'Ao cadastrar a clínica, o sistema cria automaticamente o usuário gestor com e-mail e senha para acesso dedicado.'
      },
      {
        title: '3. Personalizar Módulos Ativos',
        description: 'Escolha quais ferramentas a clínica contratou (CRM, Agenda, Follow-ups, Relatórios, Análise de Dados).'
      },
      {
        title: '4. Monitorar o Status de Conexão',
        description: 'Verifique se as integrações da clínica (Google Calendar, Webhooks de Leads) estão ativas e sincronizando.'
      }
    ],
    interactiveHighlights: [
      { label: 'Isolamento Multi-Tenant', detail: 'Dados 100% seguros e blindados entre diferentes clientes', tag: 'Segurança' },
      { label: 'Criação Automática de Usuário', detail: 'Gera login pronto para o dono da clínica acessar', tag: 'Onboarding' },
      { label: 'Ativação Modular', detail: 'Ligue e desligue recursos conforme o plano contratado', tag: 'Planos' }
    ],
    proTips: [
      'Você pode desativar temporariamente o acesso de uma clínica sem perder o histórico de dados.',
      'Use o simulador de perfis para visualizar exatamente a tela que o seu cliente está vendo.'
    ]
  },
  {
    id: 'pipeline-super',
    category: 'CRM',
    categoryLabel: 'CRM & Captação',
    title: 'Pipeline Kanban de Leads & Funil de Conversão',
    subtitle: 'Controle o fluxo comercial completo desde a captura do lead até o fechamento da venda.',
    icon: Target,
    targetTab: 'leads',
    targetTabLabel: 'Abrir Pipeline',
    badgeColor: 'bg-emerald-600 text-white',
    overview: 'O Pipeline organiza todos os contatos que chegam pelas campanhas em etapas visuais: Novo Lead ➔ 1º Contato ➔ 2º Contato ➔ 3º Contato ➔ Interagiu ➔ Agendado ➔ Compareceu ➔ Vendido.',
    actionSteps: [
      {
        title: '1. Visualização em Colunas Kanban',
        description: 'Acompanhe os cards de leads organizados por etapa de atendimento com tags de origem e valor provável.'
      },
      {
        title: '2. Arrastar e Soltar (Drag & Drop)',
        description: 'Atualize o estágio do lead instantaneamente movendo o card entre as colunas.'
      },
      {
        title: '3. Ações Rápidas de WhatsApp',
        description: 'Clique no ícone de WhatsApp no cartão para abrir a conversa direta com o paciente.'
      },
      {
        title: '4. Ficha Detalhada com UTMs e Histórico',
        description: 'Abra o lead para inspecionar campanha de tráfego, criativo, anotações e histórico de interações.'
      }
    ],
    interactiveHighlights: [
      { label: 'SLA de 1º Contato', detail: 'Alerta visual para contatos que aguardam atendimento', tag: 'Velocidade' },
      { label: 'Rastreamento Completo', detail: 'UTMs gravadas para mensurar ROI dos anúncios', tag: 'Tráfego' },
      { label: 'Visualização Alternativa', detail: 'Alterne entre visão Kanban e Tabela com filtros avançados', tag: 'Flexibilidade' }
    ],
    proTips: [
      'Leads atendidos nos primeiros 5 minutos aumentam a chance de agendamento em até 400%.',
      'Exporte bases completas em CSV ou PDF para relatórios mensais.'
    ],
    shortcuts: ['Ctrl + L : Ir para o Pipeline', 'Ctrl + N : Cadastrar Novo Lead']
  },
  {
    id: 'novo-lead-super',
    category: 'CRM',
    categoryLabel: 'CRM & Captação',
    title: 'Cadastro de Leads & Verificação Inteligente de Duplicidade',
    subtitle: 'Garanta a integridade da base com verificação automática de contatos repetidos em tempo real.',
    icon: ShieldCheck,
    targetTab: 'leads',
    targetTabLabel: 'Cadastrar Lead',
    badgeColor: 'bg-blue-600 text-white',
    overview: 'O formulário de cadastro possui proteção ativa contra duplicidades: ao digitar WhatsApp ou E-mail, o sistema consulta a base da clínica e impede registros duplicados, alertando quem é o lead existente.',
    actionSteps: [
      {
        title: '1. Pressionar Ctrl + N ou Clicar em "+ Novo Lead"',
        description: 'Abra o modal de cadastro rápido estruturado em Dados Básicos, Procedimento e Origem.'
      },
      {
        title: '2. Digitação com Verificação Instantânea',
        description: 'Ao preencher o telefone ou e-mail, o sistema consulta o banco daquela unidade em tempo real.'
      },
      {
        title: '3. Alerta Visual de Duplicidade',
        description: 'Se o contato já existir, é exibido o card do lead original com o status atual e o responsável.'
      },
      {
        title: '4. Importação em Lote via CSV',
        description: 'Importe listas prévias com mapeamento automático de colunas para enriquecer a base.'
      }
    ],
    interactiveHighlights: [
      { label: 'Normalizador de Telefone', detail: 'Identifica duplicidade mesmo com DDDs ou formatos diferentes', tag: 'Anti-Spam' },
      { label: 'Validação por Clínica', detail: 'Checa duplicidade dentro da unidade ativa selecionada', tag: 'Multi-Tenant' },
      { label: 'Campos de Tracking', detail: 'Suporte a Source, Medium, Campaign, Content e Term', tag: 'Meta/Google' }
    ],
    proTips: [
      'Sempre preencha o valor estimado do procedimento para alimentar as previsões de faturamento no Dashboard.'
    ]
  },
  {
    id: 'analise-dados-super',
    category: 'RELATORIOS',
    categoryLabel: 'Relatórios & Inteligência',
    title: 'Análise de Dados de Anúncios (Meta / Google) & ROI',
    subtitle: 'Cruze dados de investimento em tráfego pago com vendas reais e comparecimento nas clínicas.',
    icon: BarChart3,
    targetTab: 'analise-dados',
    targetTabLabel: 'Abrir Análise de Dados',
    badgeColor: 'bg-indigo-600 text-white',
    overview: 'Descubra a eficiência real de cada canal de marketing. Visualize o Custo por Lead (CPL), Taxa de Comparecimento Presencial e Custo de Aquisição de Clientes (CAC) por fonte.',
    actionSteps: [
      {
        title: '1. Comparar Canais de Origem',
        description: 'Analise o desempenho de Meta Ads (Facebook/Instagram), Google Ads, Orgânico e Indicações.'
      },
      {
        title: '2. Medir a Taxa de Comparecimento',
        description: 'Descubra qual canal traz pacientes mais qualificados com menor índice de faltas (no-show).'
      },
      {
        title: '3. Calcular o CAC e Retorno Financeiro',
        description: 'Cruze o valor fechado em tratamentos com o canal que originou o primeiro contato.'
      },
      {
        title: '4. Exportar Relatórios Executivos',
        description: 'Gere relatórios em PDF formatados para apresentar resultados para os donos das clínicas parceiras.'
      }
    ],
    interactiveHighlights: [
      { label: 'CPL Real', detail: 'Custo por contato qualificado gerado', tag: 'Marketing' },
      { label: 'Taxa de Fechamento', detail: 'Percentual de consultas que viraram tratamento vendido', tag: 'Conversão' },
      { label: 'Exportar PDF / CSV', detail: 'Download instantâneo de dados para reuniões e planilhas', tag: 'Exportação' }
    ],
    proTips: [
      'Foque o orçamento de tráfego nos canais com maior taxa de presença presencial, e não apenas no maior volume de cliques.'
    ]
  },
  {
    id: 'integracoes-super',
    category: 'ADMIN',
    categoryLabel: 'Administração & APIs',
    title: 'Central de Integrações, Webhooks do Meta & Supabase',
    subtitle: 'Conecte formulários de anúncios do Meta Lead Ads, Google Calendar e banco em tempo real.',
    icon: Link2,
    targetTab: 'integracoes',
    targetTabLabel: 'Ver Integrações',
    badgeColor: 'bg-indigo-600 text-white',
    overview: 'Configure a infraestrutura de integrações da plataforma: endpoints de Webhook para receber leads do Meta Ads em menos de 1 segundo, credenciais do Supabase e sincronização da Agenda Google.',
    actionSteps: [
      {
        title: '1. Configurar Webhooks de Entrada',
        description: 'Receba leads instantaneamente do Facebook/Instagram Lead Ads ou ferramentas como Zapier e n8n.'
      },
      {
        title: '2. Sincronizar Google Calendar',
        description: 'Conecte agendas de doutores para sincronização bidirecional de horários de consulta.'
      },
      {
        title: '3. Testar Envio de Leads',
        description: 'Utilize a ferramenta de teste de webhook para simular a chegada de contatos antes de subir campanhas.'
      }
    ],
    interactiveHighlights: [
      { label: 'Meta Webhooks', detail: 'Captura em tempo real no momento do clique do usuário', tag: 'Realtime' },
      { label: 'OAuth Google Calendar', detail: 'Sincronização sem necessidade de expor credenciais', tag: 'Google API' },
      { label: 'Banco Supabase', detail: 'Persistência segura e isolamento multi-clínicas', tag: 'Cloud DB' }
    ],
    proTips: [
      'Sempre valide o formato dos campos de telefone no payload do webhook para garantir a máscara automática.'
    ]
  },
  {
    id: 'equipe-super',
    category: 'ADMIN',
    categoryLabel: 'Administração & Usuários',
    title: 'Gestão de Usuários & Perfis de Acesso (RBAC)',
    subtitle: 'Cadastre gerentes, secretárias e doutores com permissões restritas e seguras.',
    icon: Users,
    targetTab: 'equipe',
    targetTabLabel: 'Gerenciar Equipe',
    badgeColor: 'bg-emerald-600 text-white',
    overview: 'Controle quem pode acessar cada área do sistema. Defina perfis de Super Admin, Administrador da Clínica (Cliente), Gerente de Atendimento, Operador de Recepção e Doutores.',
    actionSteps: [
      {
        title: '1. Adicionar Membros de Equipe',
        description: 'Clique em "+ Novo Membro", insira os dados cadastrais e escolha a função correspondente.'
      },
      {
        title: '2. Definir as Clínicas Acessíveis',
        description: 'Vincule quais filiais aquele usuário pode acessar no seletor de clínicas.'
      },
      {
        title: '3. Suspender ou Reativar Logins',
        description: 'Controle o acesso de funcionários com 1 clique para garantir a conformidade com a LGPD.'
      }
    ],
    interactiveHighlights: [
      { label: 'Controle por Função (RBAC)', detail: 'Restringe acesso a relatórios financeiros e configurações sensíveis', tag: 'Segurança' },
      { label: 'Multi-Clínica por Usuário', detail: 'Permite que um mesmo gerente supervisione 2 ou mais unidades', tag: 'Gestão' },
      { label: 'Logs de Atividade', detail: 'Rastreabilidade completa de ações realizadas no sistema', tag: 'Auditoria' }
    ],
    proTips: [
      'Secretárias devem ter perfil de Operador CRC para focar em agendamentos sem visualizar faturamento global.'
    ]
  }
];

// 2. GUIA PARA O CLIENTE DO RODRIGO (ADMINISTRADOR DA CLÍNICA / DONO DA EMPRESA)
const CLINIC_ADMIN_STEPS: GuideStep[] = [
  {
    id: 'dashboard-cliente',
    category: 'WORKSPACE',
    categoryLabel: 'Minha Clínica',
    title: 'Dashboard da Sua Clínica: Metas, Consultas & Faturamento',
    subtitle: 'Acompanhe em tempo real os atendimentos do dia, ocupação da agenda e vendas da sua clínica.',
    icon: LayoutDashboard,
    targetTab: 'dashboard',
    targetTabLabel: 'Abrir Meu Dashboard',
    badgeColor: 'bg-blue-600 text-white',
    overview: 'Este é o painel de comando da sua empresa. Aqui você visualiza o fluxo de pacientes de hoje, quantas pessoas confirmaram presença, quantas estão pendentes de contato pela sua recepção e o faturamento acumulado.',
    actionSteps: [
      {
        title: '1. Acompanhar os Quadrados de Atendimento do Dia',
        description: 'Veja no topo: Hoje (Confirmados), Hoje (Pendentes de Confirmação), Amanhã e Faltas de Ontem para recuperação.'
      },
      {
        title: '2. Filtrar Períodos de Faturamento e Atendimento',
        description: 'Alterne entre [Hoje], [Ontem], [Últimos 7 dias] e [Últimos 30 dias] para ver a evolução das suas metas.'
      },
      {
        title: '3. Avaliar as Fontes de Pacientes',
        description: 'Veja quais canais de divulgação (Instagram, Google, Indicações) estão trazendo mais consultas para a sua clínica.'
      },
      {
        title: '4. Resolver Pendências Rápidas',
        description: 'Clique em "Clique para Resolver" para verificar tarefas da recepção que precisam de atenção imediata.'
      }
    ],
    interactiveHighlights: [
      { label: 'Confirmados de Hoje', detail: 'Pacientes que já confirmaram presença nos consultórios', tag: 'Ocupação' },
      { label: 'Pendentes de Contato', detail: 'Pacientes que sua secretária precisa contatar agora', tag: 'Ação Urgente' },
      { label: 'Faltas de Ontem', detail: 'Pacientes que faltaram e devem ser remarcados para não perder o tratamento', tag: 'Recuperação' },
      { label: 'Faturamento Estimado', detail: 'Total em tratamentos fechados no período selecionado', tag: 'Financeiro' }
    ],
    proTips: [
      'Revise a caixa "Faltas de Ontem" toda manhã com sua recepcionista para reagendar pelo menos 50% dos pacientes.',
      'Todos os números exibidos são exclusivos e restritos à sua empresa.'
    ],
    shortcuts: ['Ctrl + D : Atalho rápido para o Dashboard', 'Filtros com 1 clique']
  },
  {
    id: 'pipeline-cliente',
    category: 'CRM',
    categoryLabel: 'Comercial & Vendas',
    title: 'Pipeline de Atendimento: Como Fechar Mais Tratamentos',
    subtitle: 'Acompanhe as oportunidades de novos pacientes em colunas visuais desde o primeiro contato até o fechamento.',
    icon: Target,
    targetTab: 'leads',
    targetTabLabel: 'Abrir Pipeline da Clínica',
    badgeColor: 'bg-emerald-600 text-white',
    overview: 'O Pipeline organiza todos os contatos que chegam pelas campanhas da sua clínica em etapas claras, garantindo que sua equipe comercial e de recepção não esqueça nenhum paciente.',
    actionSteps: [
      {
        title: '1. Entender as Etapas do Funil da Sua Clínica',
        description: 'Novo Lead ➔ 1º Contato ➔ 2º Contato ➔ 3º Contato ➔ Interagiu ➔ Agendado ➔ Compareceu ➔ Tratamento Fechado.'
      },
      {
        title: '2. Monitorar o Tempo de Resposta da Recepção',
        description: 'Garanta que novos contatos recebam mensagem no WhatsApp em menos de 5 minutos após o envio do formulário.'
      },
      {
        title: '3. Acompanhar Agendamentos e Vendas',
        description: 'Mova os cartões para "Compareceu" quando o paciente estiver na recepção e "Vendido" quando aprovar o orçamento.'
      },
      {
        title: '4. Abrir Conversa Direta no WhatsApp',
        description: 'Clique no botão verde de WhatsApp no cartão para abrir a conversa instantaneamente com o paciente.'
      }
    ],
    interactiveHighlights: [
      { label: 'Novos Contatos', detail: 'Pessoas interessadas em tratamentos aguardando 1º contato', tag: 'Recepção' },
      { label: 'Consultas Marcadas', detail: 'Pacientes com horário reservado na agenda da clínica', tag: 'Agenda' },
      { label: 'Tratamentos Fechados', detail: 'Planos de tratamento aprovados com valor financeiro registrado', tag: 'Vendas' }
    ],
    proTips: [
      'Audite semanalmente os contatos que estão na coluna "Interagiu" para incentivar sua equipe a fechar o agendamento.',
      'Você pode filtrar por procedimento (ex: Implante, Ortodontia, Harmonização).'
    ],
    shortcuts: ['Ctrl + L : Ir para o Pipeline', 'Ctrl + N : Novo Lead']
  },
  {
    id: 'pacientes-cliente',
    category: 'OPERACOES',
    categoryLabel: 'Atendimento & Prontuário',
    title: 'Gestão de Pacientes, Tratamentos & Histórico Clínico',
    subtitle: 'Centralize prontuários, procedimentos realizados, valores investidos e dados de contato dos seus pacientes.',
    icon: UserCircle,
    targetTab: 'pacientes',
    targetTabLabel: 'Ver Meus Pacientes',
    badgeColor: 'bg-teal-600 text-white',
    overview: 'A área de Pacientes da sua clínica reúne todas as pessoas que já realizaram consultas ou procedimentos, facilitando o acompanhamento de retornos periódicos e controle financeiro.',
    actionSteps: [
      {
        title: '1. Pesquisar Ficha do Paciente',
        description: 'Localize rapidamente por Nome, CPF, Telefone ou WhatsApp.'
      },
      {
        title: '2. Acompanhar Tratamentos em Andamento',
        description: 'Veja quais procedimentos foram executados e quais ainda estão pendentes de conclusão.'
      },
      {
        title: '3. Consultar Valor Total Investido (LTV)',
        description: 'Identifique seus pacientes VIPs e o total de receita gerada por cada um ao longo do tempo.'
      },
      {
        title: '4. Programar Mensagem de Retorno Preventivo',
        description: 'Agende contatos semestrais de profilaxia e manutenção diretamente pela ficha.'
      }
    ],
    interactiveHighlights: [
      { label: 'Ficha Completa', detail: 'Dados pessoais, endereço, CPF e observações clínicas', tag: 'Prontuário' },
      { label: 'Histórico Financeiro', detail: 'Valores pagos e saldos em aberto de tratamentos', tag: 'Financeiro' },
      { label: 'Tags de Segmentação', detail: 'Classifique pacientes por especialidade ou preferência', tag: 'Organização' }
    ],
    proTips: [
      'Filtre pacientes que não visitam a clínica há mais de 6 meses para campanhas de retorno e check-up.'
    ]
  },
  {
    id: 'agenda-cliente',
    category: 'OPERACOES',
    categoryLabel: 'Escala & Consultórios',
    title: 'Agenda da Clínica & Sincronização Google Calendar',
    subtitle: 'Organize os consultórios, horários dos doutores e evite faltas com confirmações no WhatsApp.',
    icon: Calendar,
    targetTab: 'agenda',
    targetTabLabel: 'Abrir Agenda da Clínica',
    badgeColor: 'bg-purple-600 text-white',
    overview: 'Gerencie a ocupação das salas de atendimento e a grade de horários dos profissionais da sua clínica. Conecte com o Google Calendar para os doutores verem os compromissos no próprio smartphone.',
    actionSteps: [
      {
        title: '1. Visualizar por Dia, Semana ou Mês',
        description: 'Alterne a visualização para ver a ocupação geral da clínica ou filtrar por doutor específico.'
      },
      {
        title: '2. Marcar Nova Consulta com Procedimento e Sala',
        description: 'Clique em um horário vago na grade, selecione o paciente, o tipo de procedimento e a sala.'
      },
      {
        title: '3. Atualizar Status de Presença',
        description: 'Marque quando o paciente confirmar, quando comparecer ou quando faltar para manter os relatórios precisos.'
      },
      {
        title: '4. Conectar Google Calendar dos Doutores',
        description: 'Sincronize a agenda com o celular dos profissionais com 1 clique.'
      }
    ],
    interactiveHighlights: [
      { label: 'Controle de Consultórios', detail: 'Evite conflitos de espaço físico na sua clínica', tag: 'Salas' },
      { label: 'Google Agenda Integrado', detail: 'Compromissos sincronizados nos celulares da equipe', tag: 'Google Calendar' },
      { label: 'Confirmação D-1', detail: 'Reduza faltas confirmando horários no dia anterior', tag: 'Anti-Falta' }
    ],
    proTips: [
      'Defina durações de consulta realistas para cada procedimento para evitar filas de espera na recepção.'
    ]
  },
  {
    id: 'relatorios-cliente',
    category: 'RELATORIOS',
    categoryLabel: 'Resultados da Sua Clínica',
    title: 'Relatórios de Desempenho & Retorno do Marketing (ROI)',
    subtitle: 'Veja quantas pessoas compareceram, quantos tratamentos foram vendidos e o faturamento real da sua unidade.',
    icon: FileText,
    targetTab: 'relatorios',
    targetTabLabel: 'Ver Relatórios da Clínica',
    badgeColor: 'bg-blue-600 text-white',
    overview: 'Analise os resultados do seu investimento: saiba exatamente quais canais de divulgação trazem pacientes que realmente vão à clínica e fecham tratamento, com relatórios em PDF prontos para download.',
    actionSteps: [
      {
        title: '1. Acompanhar Taxas de Comparecimento e Conversão',
        description: 'Veja a porcentagem de pacientes que compareceram à avaliação e fecharam o plano proposto.'
      },
      {
        title: '2. Baixar Relatório em PDF da Sua Clínica',
        description: 'Gere um documento executivo formatado com o nome da sua clínica e gráficos consolidados.'
      },
      {
        title: '3. Exportar Listas em Excel / CSV',
        description: 'Baixe bases de dados para seu controle financeiro ou contabilidade com 1 clique.'
      }
    ],
    interactiveHighlights: [
      { label: 'Taxa de Presença', detail: 'Porcentagem de pacientes agendados que foram atendidos', tag: 'Presença' },
      { label: 'Ticket Médio', detail: 'Valor médio gasto por paciente na sua clínica', tag: 'Ticket' },
      { label: 'Exportação em PDF', detail: 'Relatório limpo para prestação de contas com sócios', tag: 'Download' }
    ],
    proTips: [
      'Acompanhe o relatório semanalmente para ajustar metas com a equipe de dentistas/médicos e recepção.'
    ]
  },
  {
    id: 'equipe-cliente',
    category: 'ADMIN',
    categoryLabel: 'Minha Equipe',
    title: 'Gestão da Sua Equipe (Secretárias e Doutores)',
    subtitle: 'Cadastre suas recepcionistas e profissionais de saúde com os acessos corretos ao sistema da sua clínica.',
    icon: Users,
    targetTab: 'equipe',
    targetTabLabel: 'Gerenciar Minha Equipe',
    badgeColor: 'bg-emerald-600 text-white',
    overview: 'Adicione os membros da sua clínica ao sistema. Cada recepcionista pode ter seu próprio login para responder leads e agendar consultas, mantendo o histórico de quem atendeu cada paciente.',
    actionSteps: [
      {
        title: '1. Cadastrar Secretária ou Doutor',
        description: 'Clique em "+ Novo Membro", insira Nome, E-mail e selecione a função (Operador de Atendimento ou Doutor).'
      },
      {
        title: '2. Definir Permissões de Acesso',
        description: 'Sua equipe terá acesso apenas aos dados da sua própria clínica com total segurança e privacidade.'
      },
      {
        title: '3. Acompanhar Produtividade Individual',
        description: 'Veja quantas tarefas e contatos cada atendente realizou no dia.'
      }
    ],
    interactiveHighlights: [
      { label: 'Logins Individuais', detail: 'Rastreabilidade de quem fez o agendamento e contato', tag: 'Organização' },
      { label: 'Segurança Local', detail: 'Acesso estritamente restrito aos dados da sua clínica', tag: 'Privacidade' }
    ],
    proTips: [
      'Crie um usuário para cada recepcionista em vez de usar um login compartilhado.'
    ]
  },
  {
    id: 'config-cliente',
    category: 'CONFIG',
    categoryLabel: 'Configurações da Empresa',
    title: 'Catálogo de Serviços, Preços & Dados da Sua Clínica',
    subtitle: 'Configure a tabela de procedimentos médicos/odontológicos, valores padrão e dados cadastrais.',
    icon: Settings,
    targetTab: 'configuracoes',
    targetTabLabel: 'Abrir Minhas Configurações',
    badgeColor: 'bg-slate-800 text-white dark:bg-slate-700',
    overview: 'Personalize o sistema com a cara da sua empresa: cadastre seus tratamentos com preços e tempos de duração em minutos, atualize o WhatsApp oficial da clínica e alterne o visual entre Modo Claro e Escuro.',
    actionSteps: [
      {
        title: '1. Cadastrar Procedimentos da Sua Clínica',
        description: 'Insira tratamentos (ex: Limpeza, Clareamento, Implante, Ortodontia) com preço base e duração estimada.'
      },
      {
        title: '2. Atualizar Dados Cadastrais e WhatsApp',
        description: 'Mantenha o CNPJ, endereço e número de WhatsApp da clínica sempre corretos.'
      },
      {
        title: '3. Escolher Tema Visual (Claro / Escuro)',
        description: 'Alterne a aparência do sistema conforme a iluminação da sua recepção ou consultório.'
      }
    ],
    interactiveHighlights: [
      { label: 'Tabela de Procedimentos', detail: 'Valores e tempos de cadeira padronizados na sua clínica', tag: 'Serviços' },
      { label: 'WhatsApp da Clínica', detail: 'Número utilizado para disparar mensagens aos pacientes', tag: 'Comunicação' }
    ],
    proTips: [
      'Mantenha a tabela de procedimentos atualizada para facilitar o preenchimento de orçamentos pela recepção.'
    ]
  }
];

// 3. GUIA PARA A SECRETÁRIA / ATENDIMENTO / OPERADOR CRC
const CRC_OPERATOR_STEPS: GuideStep[] = [
  {
    id: 'dia-secretaria',
    category: 'WORKSPACE',
    categoryLabel: 'Rotina da Manhã',
    title: 'Visão do Dia: Confirmados de Hoje, Pendentes e Faltas de Ontem',
    subtitle: 'Sua rotina diária começa aqui: saiba exatamente quem atender, quem confirmar e quem resgatar.',
    icon: LayoutDashboard,
    targetTab: 'dashboard',
    targetTabLabel: 'Abrir Visão do Dia',
    badgeColor: 'bg-blue-600 text-white',
    overview: 'Ao chegar na clínica pela manhã, o Dashboard mostra tudo o que você precisa fazer no dia organizado em caixas claras: quem já confirmou presença, quem ainda precisa de confirmação e quem faltou ontem para remarcar.',
    actionSteps: [
      {
        title: '1. Conferir "Hoje (Confirmados)"',
        description: 'Lista de pacientes que já garantiram presença hoje. Prepare a recepção e os prontuários dos doutores.'
      },
      {
        title: '2. Ligar ou Chamar no WhatsApp "Hoje (Pendentes)"',
        description: 'Pacientes com consulta marcada para hoje que ainda não responderam. Mande mensagem de confirmação urgente!'
      },
      {
        title: '3. Enviar Mensagem para "Amanhã (Pendentes)"',
        description: 'Faça a confirmação das consultas do dia seguinte antes das 16h para dar tempo de encaixar outros pacientes.'
      },
      {
        title: '4. Resgatar "Ontem (Faltas)"',
        description: 'Pacientes que não compareceram ontem. Mande mensagem amigável para reagendar o quanto antes.'
      }
    ],
    interactiveHighlights: [
      { label: '1ª Tarefa do Dia', detail: 'Abrir os pendentes de hoje e confirmar horários', tag: 'Urgente' },
      { label: '2ª Tarefa do Dia', detail: 'Mandar mensagem amigável para quem faltou ontem', tag: 'Recuperação' },
      { label: '3ª Tarefa da Tarde', detail: 'Confirmar todos os agendamentos do dia seguinte', tag: 'Confirmação D-1' }
    ],
    proTips: [
      'Se o paciente não responder no WhatsApp até as 14h, faça uma ligação rápida e gentil.',
      'Sempre pergunte se o paciente precisará de atestado ou estacionamento.'
    ],
    shortcuts: ['Ctrl + D : Voltar ao Dashboard a qualquer momento']
  },
  {
    id: 'pipeline-secretaria',
    category: 'CRM',
    categoryLabel: 'Atendimento Rápido',
    title: 'Pipeline de Leads: Como Atender em Menos de 5 Minutos',
    subtitle: 'Responda novos contatos rapidamente no WhatsApp e conduza o paciente até a consulta marcada.',
    icon: Target,
    targetTab: 'leads',
    targetTabLabel: 'Abrir Pipeline de Atendimento',
    badgeColor: 'bg-emerald-600 text-white',
    overview: 'Quando uma pessoa clica em um anúncio da clínica no Instagram ou Facebook, ela cai na coluna "Novo Lead". Quanto mais rápido você responder, maior a chance de marcar a consulta!',
    actionSteps: [
      {
        title: '1. Olhar a Coluna "Novo Lead"',
        description: 'Assim que aparecer um novo cartão, clique no botão de WhatsApp para abrir a conversa.'
      },
      {
        title: '2. Enviar a Mensagem de Apresentação',
        description: 'Cumprimente pelo nome, mencione o procedimento que ela demonstrou interesse e ofereça 2 opções de horário.'
      },
      {
        title: '3. Mover o Cartão para "1º Contato"',
        description: 'Arraste o cartão para a coluna "1º Contato" para indicar que você já iniciou o atendimento.'
      },
      {
        title: '4. Quando o Paciente Escolher o Horário',
        description: 'Marque na Agenda da clínica e arraste o cartão para a coluna "Agendamento".'
      }
    ],
    interactiveHighlights: [
      { label: 'Botão WhatsApp', detail: 'Abre a conversa no WhatsApp Web com 1 clique', tag: 'Praticidade' },
      { label: 'Regra dos 5 Minutos', detail: 'Contatos respondidos na hora agendam 4x mais', tag: 'Super Dica' },
      { label: 'Arraste e Solte', detail: 'Mova o cartão com o mouse para a próxima etapa', tag: 'Kanban' }
    ],
    proTips: [
      'Sempre ofereça opções fechadas: "Temos disponibilidade amanhã às 14h ou na quarta às 10h. Qual fica melhor para você?"',
      'Nunca deixe um lead sem resposta por mais de 10 minutos em horário comercial.'
    ],
    shortcuts: ['Ctrl + L : Acessar Pipeline', 'Ctrl + N : Cadastrar novo contato']
  },
  {
    id: 'novo-lead-secretaria',
    category: 'CRM',
    categoryLabel: 'Cadastro Seguro',
    title: 'Como Cadastrar Novos Contatos Sem Criar Duplicidade',
    subtitle: 'Cadastre pacientes que ligaram ou vieram pessoalmente com verificação automática de telefone.',
    icon: ShieldCheck,
    targetTab: 'leads',
    targetTabLabel: 'Cadastrar Contato',
    badgeColor: 'bg-blue-600 text-white',
    overview: 'Quando um paciente ligar na recepção ou vier no balcão, use o botão "+ Novo Lead" (ou atalho Ctrl + N). O sistema avisa na hora se o telefone ou e-mail já estiver cadastrado!',
    actionSteps: [
      {
        title: '1. Pressionar Ctrl + N ou Clicar em "+ Novo Lead"',
        description: 'Abre a janela de cadastro de novo contato da clínica.'
      },
      {
        title: '2. Preencher Nome e WhatsApp',
        description: 'Digite o telefone com DDD. O sistema coloca a máscara correta automaticamente.'
      },
      {
        title: '3. Ficar Atenta ao Alerta de Duplicidade',
        description: 'Se o contato já existir na clínica, uma mensagem em vermelho avisa quem é o paciente para você não duplicar.'
      },
      {
        title: '4. Selecionar o Procedimento Desejado',
        description: 'Escolha o que o paciente busca (ex: Avaliação, Clareamento, Implante, Dor de Dente, etc).'
      }
    ],
    interactiveHighlights: [
      { label: 'Aviso em Vermelho', detail: 'Indica na hora se o paciente já tem cadastro na clínica', tag: 'Proteção' },
      { label: 'Máscara Automática', detail: 'Formata DDD e número de celular sem esforço', tag: 'Agilidade' }
    ],
    proTips: [
      'Pergunte sempre: "Você já é paciente da nossa clínica ou é sua primeira vez conosco?"',
      'Anote no campo de observações qualquer queixa principal do paciente para o doutor ler antes da consulta.'
    ],
    shortcuts: ['Ctrl + N : Abrir janela de Novo Lead em qualquer tela']
  },
  {
    id: 'agenda-secretaria',
    category: 'OPERACOES',
    categoryLabel: 'Recepção & Consultórios',
    title: 'Como Marcar Consultas, Encaixes e Controlar Presenças',
    subtitle: 'Mantenha a agenda dos doutores organizada, sem sobreposição de horários ou salas cheias.',
    icon: Calendar,
    targetTab: 'agenda',
    targetTabLabel: 'Abrir Agenda da Clínica',
    badgeColor: 'bg-purple-600 text-white',
    overview: 'A Agenda é sua ferramenta principal para encaixar pacientes, ver em qual sala cada doutor está atendendo e registrar se o paciente chegou na sala de espera ou se faltou.',
    actionSteps: [
      {
        title: '1. Clicar no Horário Vago na Grade',
        description: 'Clique diretamente no espaço de horário desejado no calendário.'
      },
      {
        title: '2. Escolher Paciente, Doutor e Procedimento',
        description: 'Selecione o paciente cadastrado, o profissional que vai atender e a sala de consultório.'
      },
      {
        title: '3. Quando o Paciente Chegar na Clínica',
        description: 'Mude o status do agendamento para "Compareceu" para que o doutor saiba que ele está na recepção.'
      },
      {
        title: '4. Se o Paciente Desmarcar',
        description: 'Mude para "Cancelado" ou "Reagendado" e libere o horário para outro encaixe.'
      }
    ],
    interactiveHighlights: [
      { label: 'Cores de Status', detail: 'Verde = Confirmado, Amarelo = Pendente, Azul = Reagendado, Vermelho = Faltou', tag: 'Visual' },
      { label: 'Aviso ao Doutor', detail: 'O status atualiza no Google Calendar do celular do profissional', tag: 'Sincronizado' }
    ],
    proTips: [
      'Mantenha sempre uma lista de espera de 3 a 5 pacientes que aceitariam encaixe no mesmo dia caso alguém desmarque.'
    ]
  },
  {
    id: 'followups-secretaria',
    category: 'OPERACOES',
    categoryLabel: 'Recuperação de Pacientes',
    title: 'Follow-ups: Como Resgatar Pacientes que Pararam de Responder',
    subtitle: 'Não deixe vendas esfriarem. Use a lista diária de acompanhamento para reaquecer conversas.',
    icon: Activity,
    targetTab: 'followups',
    targetTabLabel: 'Abrir Fila de Follow-ups',
    badgeColor: 'bg-amber-600 text-white',
    overview: 'Muitos pacientes se distraem e esquecem de responder. A área de Follow-ups lista automaticamente quem está há mais de 24h sem resposta para você enviar uma mensagem amigável de lembrete.',
    actionSteps: [
      {
        title: '1. Abrir a Fila de Follow-ups do Dia',
        description: 'Veja todos os pacientes com tentativas de contato programadas para hoje.'
      },
      {
        title: '2. Enviar a Mensagem de Acompanhamento',
        description: 'Use modelos prontos e gentis: "Olá [Nome], tudo bem? Conseguimos segurar aquele horário para você até hoje às 17h!".'
      },
      {
        title: '3. Marcar o Resultado da Tentativa',
        description: 'Registre se o paciente respondeu, se pediu para ligar depois ou se confirmou a consulta.'
      },
      {
        title: '4. Agendar a Próxima Tentativa',
        description: 'Se não responder, programe o 2º ou 3º contato para 2 dias depois.'
      }
    ],
    interactiveHighlights: [
      { label: 'Tentativa 1, 2 e 3', detail: 'Régua estruturada para não ser chata, mas não perder a venda', tag: 'Cadência' },
      { label: 'Modelos de Mensagem', detail: 'Textos testados que aumentam a taxa de resposta', tag: 'Copywriting' }
    ],
    proTips: [
      'A maioria das consultas é fechada na 2ª ou 3ª mensagem de follow-up, nunca desista na 1ª tentativa!'
    ]
  },
  {
    id: 'tarefas-secretaria',
    category: 'OPERACOES',
    categoryLabel: 'Checklist Diário',
    title: 'Minhas Tarefas & Pendências do Dia da Recepção',
    subtitle: 'Mantenha todos os recados, confirmações e pós-atendimentos em dia com a lista de tarefas.',
    icon: CheckSquare,
    targetTab: 'tarefas',
    targetTabLabel: 'Ver Minhas Tarefas',
    badgeColor: 'bg-emerald-600 text-white',
    overview: 'Evite esquecer recados importantes dos doutores, envio de orçamentos ou confirmações especiais usando a lista de tarefas com avisos de prazo e prioridade.',
    actionSteps: [
      {
        title: '1. Conferir Tarefas com Prioridade Alta',
        description: 'Identifique os cartões com tarja vermelha de ação urgente no topo da sua lista.'
      },
      {
        title: '2. Marcar como Concluída',
        description: 'Assim que terminar a ligação ou o envio de mensagem, marque o checkbox para limpar a lista.'
      },
      {
        title: '3. Criar Lembrete Rápido',
        description: 'Clique em "+ Nova Tarefa" para anotar recados de pacientes vinculados diretamente à ficha deles.'
      }
    ],
    interactiveHighlights: [
      { label: 'Checklist da Recepção', detail: 'Tarefas claras com horário limite para conclusão', tag: 'Produtividade' },
      { label: 'Vinculado ao Paciente', detail: 'Abre a ficha do paciente em 1 clique ao clicar na tarefa', tag: 'Prático' }
    ],
    proTips: [
      'Finalize o dia deixando a lista de tarefas com 0 pendências atrasadas para começar o dia seguinte com tranquilidade.'
    ]
  }
];

export default function SystemWalkthroughGuide() {
  const { user, currentClinic, setActiveTab } = useApp();
  
  // Auto-detect role or allow simulation toggle
  const initialRole: GuideRoleProfile = useMemo(() => {
    if (user?.role === Role.SUPER_ADMIN) return 'super_admin';
    if (user?.role === Role.CLINIC_ADMIN || user?.role === Role.CRC_MANAGER) return 'clinic_admin';
    return 'crc_operator';
  }, [user?.role]);

  const [selectedRoleProfile, setSelectedRoleProfile] = useState<GuideRoleProfile>(initialRole);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'carousel' | 'overview'>('carousel');

  // Update role profile if user role changes
  useEffect(() => {
    setSelectedRoleProfile(initialRole);
  }, [initialRole]);

  // Select active steps dictionary based on role profile
  const rawSteps = useMemo(() => {
    if (selectedRoleProfile === 'super_admin') return SUPER_ADMIN_STEPS;
    if (selectedRoleProfile === 'clinic_admin') return CLINIC_ADMIN_STEPS;
    return CRC_OPERATOR_STEPS;
  }, [selectedRoleProfile]);

  // Filter steps based on search & category
  const filteredSteps = useMemo(() => {
    return rawSteps.filter(step => {
      const matchesSearch = 
        step.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        step.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        step.overview.toLowerCase().includes(searchTerm.toLowerCase()) ||
        step.actionSteps.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = selectedCategory === 'ALL' || step.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [rawSteps, searchTerm, selectedCategory]);

  const activeStep = filteredSteps[currentStepIndex] || filteredSteps[0] || rawSteps[0];

  // Reset index if out of bounds after filtering or role change
  useEffect(() => {
    if (currentStepIndex >= filteredSteps.length) {
      setCurrentStepIndex(0);
    }
  }, [filteredSteps.length, currentStepIndex, selectedRoleProfile]);

  // Keyboard navigation (ArrowLeft & ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIndex, filteredSteps.length]);

  const handleNext = () => {
    if (currentStepIndex < filteredSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setCurrentStepIndex(0);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    } else {
      setCurrentStepIndex(filteredSteps.length - 1);
    }
  };

  const progressPercent = Math.round(((currentStepIndex + 1) / (filteredSteps.length || 1)) * 100);

  const categories = [
    { id: 'ALL', label: 'Todos os Tópicos' },
    { id: 'WORKSPACE', label: 'Visão do Dia' },
    { id: 'CRM', label: 'CRM & Atendimento' },
    { id: 'OPERACOES', label: 'Agenda & Consultas' },
    { id: 'RELATORIOS', label: 'Resultados' },
    { id: 'ADMIN', label: 'Equipe & Acessos' },
    { id: 'CONFIG', label: 'Configurações' }
  ];

  const roleProfiles = [
    {
      id: 'super_admin' as GuideRoleProfile,
      label: 'Super Admin (Rodrigo)',
      description: 'Visão Multi-Unidades, criação de clientes, faturamento da rede e webhooks',
      icon: Shield
    },
    {
      id: 'clinic_admin' as GuideRoleProfile,
      label: 'Cliente / Dono da Clínica',
      description: 'Gestão da sua empresa, equipe local, orçamentos, procedimentos e ROI',
      icon: Briefcase
    },
    {
      id: 'crc_operator' as GuideRoleProfile,
      label: 'Secretária & Recepção',
      description: 'Rotina do dia, agilidade no WhatsApp, consultas, confirmações e faltas',
      icon: HeartHandshake
    }
  ];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* HEADER PRINCIPAL COM SELEÇÃO DE PERFIL / PAPEL */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <BookOpen size={14} />
              <span>Manual & Guia do Sistema</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Como Utilizar o Sistema Completo
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Guia passo a passo navegável com setinhas personalizado para o seu perfil e para a sua empresa.
            </p>
          </div>

          {/* Quick Stats & Controls */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black text-sm">
                {currentStepIndex + 1}/{filteredSteps.length}
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-blue-200">Progresso do Guia</p>
                <p className="text-xs font-bold text-white">{progressPercent}% Concluído</p>
              </div>
            </div>

            {/* Toggle View Mode */}
            <div className="p-1 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-center">
              <button
                onClick={() => setViewMode('carousel')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  viewMode === 'carousel' ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:text-white"
                )}
              >
                <Play size={13} />
                <span>Passo a Passo</span>
              </button>
              <button
                onClick={() => setViewMode('overview')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  viewMode === 'overview' ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:text-white"
                )}
              >
                <Layers size={13} />
                <span>Todos os Tópicos</span>
              </button>
            </div>
          </div>
        </div>

        {/* ROLE PROFILE SELECTOR BAR */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Selecione o Perfil do Guia:
              </span>
            </div>
            <span className="text-[11px] text-blue-200 font-medium">
              Empresa ativa: <strong className="text-white">{currentClinic?.name || 'Sua Clínica'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {roleProfiles.map(profile => {
              const isSelected = selectedRoleProfile === profile.id;
              const Icon = profile.icon;
              return (
                <button
                  key={profile.id}
                  onClick={() => {
                    setSelectedRoleProfile(profile.id);
                    setCurrentStepIndex(0);
                  }}
                  className={cn(
                    "p-3 rounded-2xl text-left transition-all border flex items-start gap-3 cursor-pointer",
                    isSelected 
                      ? "bg-blue-600/90 border-blue-400 text-white shadow-lg shadow-blue-900/40 ring-2 ring-blue-400/40" 
                      : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                    isSelected ? "bg-white text-blue-700" : "bg-white/10 text-slate-300"
                  )}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold leading-tight truncate">{profile.label}</p>
                    <p className="text-[10px] text-slate-300/80 line-clamp-1 mt-0.5">{profile.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="mt-6 w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar no guia (ex: duplicidade, whatsapp, agendar, relatórios)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-600 font-bold"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setCurrentStepIndex(0);
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer",
                selectedCategory === cat.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW MODE: CAROUSEL (PASSO A PASSO COM SETAS) */}
      {viewMode === 'carousel' ? (
        <div className="space-y-6">
          {/* NAVIGATION BAR WITH BIG ARROWS */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <button
              onClick={handlePrev}
              className="px-4 sm:px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all group shadow-xs cursor-pointer"
              title="Passo Anterior (Pressione Seta Esquerda ←)"
            >
              <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span>Anterior</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-400 font-mono">
                ←
              </kbd>
            </button>

            {/* Step Indicators Quick Jumper */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[50%] py-1 custom-scrollbar">
              {filteredSteps.map((step, idx) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={cn(
                    "w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer shrink-0",
                    currentStepIndex === idx
                      ? "bg-blue-600 text-white shadow-sm scale-110"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                  title={`Ir para: ${step.title}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            <button
              onClick={handleNext}
              className="px-4 sm:px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all group shadow-sm shadow-blue-500/20 cursor-pointer"
              title="Próximo Passo (Pressione Seta Direita →)"
            >
              <span>Próximo</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] bg-blue-700 border border-blue-500 rounded text-blue-100 font-mono">
                →
              </kbd>
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* MAIN STEP CARD */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep.id + selectedRoleProfile}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-8"
            >
              {/* Step Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md",
                    activeStep.badgeColor
                  )}>
                    <activeStep.icon size={28} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-widest bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                        {activeStep.categoryLabel}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">
                        Passo {currentStepIndex + 1} de {filteredSteps.length}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {activeStep.title}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {activeStep.subtitle}
                    </p>
                  </div>
                </div>

                {/* Direct Action Button to Jump into App Screen */}
                <button
                  onClick={() => setActiveTab(activeStep.targetTab)}
                  className="self-start lg:self-center px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs flex items-center gap-2 transition-all shadow-xs group cursor-pointer"
                >
                  <ExternalLink size={15} className="group-hover:scale-110 transition-transform" />
                  <span>{activeStep.targetTabLabel}</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* Step Overview Box */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-normal">
                <div className="flex items-center gap-2 mb-2 font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                  <Lightbulb size={16} className="text-amber-500" />
                  <span>Visão Geral & Objetivo</span>
                </div>
                {activeStep.overview}
              </div>

              {/* Grid: Action Steps & Interactive Highlights */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Action Steps */}
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckSquare size={16} className="text-emerald-500" />
                    <span>Como Fazer Passo a Passo</span>
                  </h3>

                  <div className="space-y-3">
                    {activeStep.actionSteps.map((step, sIdx) => (
                      <div 
                        key={sIdx}
                        className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-1 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                      >
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-black flex items-center justify-center shrink-0">
                            {sIdx + 1}
                          </span>
                          {step.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 pl-7 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Visual Mockup & Interactive Elements */}
                <div className="lg:col-span-5 space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-blue-500" />
                    <span>Pontos de Atenção & Recursos</span>
                  </h3>

                  <div className="space-y-3">
                    {activeStep.interactiveHighlights.map((item, hIdx) => (
                      <div 
                        key={hIdx}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {item.label}
                          </span>
                          {item.tag && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                              {item.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* PRO TIPS BOX */}
                  {activeStep.proTips.length > 0 && (
                    <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/50 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                        <Zap size={15} className="text-amber-600" />
                        <span>Dicas Pro para sua Rotina</span>
                      </div>
                      <ul className="text-[11px] text-amber-800 dark:text-amber-300 space-y-1.5 list-disc pl-4">
                        {activeStep.proTips.map((tip, tIdx) => (
                          <li key={tIdx} className="leading-relaxed">{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* SHORTCUTS */}
                  {activeStep.shortcuts && activeStep.shortcuts.length > 0 && (
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Atalhos Úteis</p>
                      {activeStep.shortcuts.map((sc, scIdx) => (
                        <p key={scIdx} className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                          {sc}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* FOOTER BAR OF CURRENT STEP */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span>Passo <strong>{currentStepIndex + 1}</strong> de <strong>{filteredSteps.length}</strong></span>
                  <span>•</span>
                  <span>Use as setas do teclado para navegar</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrev}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                    <span>Anterior</span>
                  </button>

                  <button
                    onClick={handleNext}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Próximo Passo</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        /* VIEW MODE: ALL MODULES OVERVIEW (LISTA / MANUAL COMPLETO) */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSteps.map((step, idx) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between space-y-4 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-md group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                      step.badgeColor
                    )}>
                      <step.icon size={22} />
                    </div>
                    <span className="text-xs font-black text-slate-400">
                      #{idx + 1}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {step.categoryLabel}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {step.subtitle}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Principais Ações:</p>
                    {step.actionSteps.slice(0, 2).map((s, sI) => (
                      <p key={sI} className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                        • {s.title}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setCurrentStepIndex(idx);
                      setViewMode('carousel');
                    }}
                    className="flex-1 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Ver no Tour</span>
                    <ArrowRight size={13} />
                  </button>
                  <button
                    onClick={() => setActiveTab(step.targetTab)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title={`Abrir ${step.targetTabLabel}`}
                  >
                    <ExternalLink size={15} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
