import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const IMAGE_AND_PDF = {
  allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  maxSizeBytes: 10 * 1024 * 1024,
};

type DocumentTypeSeed = {
  id: string;
  name: string;
  description: string;
  icon: string;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
  maxSizeBytes?: number;
};

async function upsertDocumentType(data: DocumentTypeSeed) {
  return prisma.documentType.upsert({
    where: { id: data.id },
    update: {
      name: data.name,
      description: data.description,
      icon: data.icon,
    },
    create: {
      ...data,
      allowedExtensions: data.allowedExtensions ?? IMAGE_AND_PDF.allowedExtensions,
      allowedMimeTypes: data.allowedMimeTypes ?? IMAGE_AND_PDF.allowedMimeTypes,
      maxSizeBytes: data.maxSizeBytes ?? IMAGE_AND_PDF.maxSizeBytes,
    },
  });
}

async function seedAberturaConta(documentTypes: Record<string, { id: string }>) {
  const workflow = await prisma.workflow.upsert({
    where: { slug: 'abertura-conta' },
    update: {
      isTemplate: false,
      templateCategory: 'onboarding',
      isActive: true,
    },
    create: {
      name: 'Abertura de Conta',
      slug: 'abertura-conta',
      description: 'Envie seus documentos para abertura de conta bancária',
      isActive: true,
      isTemplate: false,
      templateCategory: 'onboarding',
    },
  });

  const existingSteps = await prisma.workflowStep.count({
    where: { workflowId: workflow.id },
  });

  if (existingSteps === 0) {
    const rgStep = await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        documentTypeId: documentTypes.rg.id,
        title: 'Documento de Identidade (RG)',
        instructions:
          'Envie uma foto ou PDF do seu **RG** (frente e verso, se possível).\n\nO documento deve estar legível e dentro da validade.',
        helpText: 'Use boa iluminação e evite reflexos na foto.',
        position: 0,
        isRequired: true,
        maxFiles: 1,
        acceptedExtensionsOverride: [],
      },
    });

    const cpfStep = await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        documentTypeId: documentTypes.cpf.id,
        title: 'CPF',
        instructions:
          'Envie o documento do seu **CPF** ou a página do RG que contém o número do CPF.',
        helpText: 'Aceitamos foto do cartão do CPF ou print do app da Receita Federal.',
        position: 1,
        conditionStepId: rgStep.id,
        isRequired: true,
        maxFiles: 1,
        acceptedExtensionsOverride: [],
      },
    });

    await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        documentTypeId: documentTypes.comprovanteResidencia.id,
        title: 'Comprovante de Residência',
        instructions:
          'Envie um comprovante de residência recente (últimos 3 meses).\n\n- Conta de luz, água ou gás\n- Extrato bancário\n- Contrato de aluguel',
        helpText: 'O endereço deve estar visível e legível.',
        position: 2,
        conditionStepId: cpfStep.id,
        isRequired: true,
        maxFiles: 1,
        acceptedExtensionsOverride: [],
      },
    });
  }

  return workflow;
}

async function seedTemplateCadastroFornecedor(documentTypes: Record<string, { id: string }>) {
  const workflow = await prisma.workflow.upsert({
    where: { slug: 'template-cadastro-fornecedor' },
    update: {
      name: 'Cadastro de Fornecedor',
      description:
        'Template genérico para homologação de fornecedores. Usa perguntas condicionais para PF/PJ e conformidade regulatória.',
      isTemplate: true,
      isActive: false,
      templateCategory: 'fornecedores',
    },
    create: {
      name: 'Cadastro de Fornecedor',
      slug: 'template-cadastro-fornecedor',
      description:
        'Template genérico para homologação de fornecedores. Usa perguntas condicionais para PF/PJ e conformidade regulatória.',
      isActive: false,
      isTemplate: true,
      templateCategory: 'fornecedores',
    },
  });

  const existingSteps = await prisma.workflowStep.count({
    where: { workflowId: workflow.id },
  });

  if (existingSteps > 0) {
    return workflow;
  }

  const perguntaRegistro = await prisma.workflowStep.create({
    data: {
      workflowId: workflow.id,
      title: 'Fornece produtos que exigem registro em órgão regulador?',
      instructions:
        'Esta pergunta ajuda a definir se documentos adicionais de conformidade serão solicitados.\n\nEx.: alimentos, cosméticos, equipamentos médicos.',
      position: 0,
      stepKind: 'QUESTION',
      questionType: 'YES_NO',
      questionConfig: {
        options: [
          { id: 'yes', label: 'Sim' },
          { id: 'no', label: 'Não' },
        ],
      },
      isRequired: true,
      maxFiles: 1,
      acceptedExtensionsOverride: [],
    },
  });

  const perguntaTipo = await prisma.workflowStep.create({
    data: {
      workflowId: workflow.id,
      title: 'Tipo de cadastro do fornecedor',
      instructions: 'Selecione se o fornecedor é pessoa física ou jurídica.',
      position: 1,
      stepKind: 'QUESTION',
      questionType: 'SINGLE_CHOICE',
      questionConfig: {
        options: [
          { id: 'pf', label: 'Pessoa Física' },
          { id: 'pj', label: 'Pessoa Jurídica' },
        ],
      },
      isRequired: true,
      maxFiles: 1,
      acceptedExtensionsOverride: [],
    },
  });

  await prisma.workflowStep.createMany({
    data: [
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.rg.id,
        title: 'Documento de Identidade (PF)',
        instructions: 'Envie RG ou CNH legível do responsável pelo fornecedor **pessoa física**.',
        helpText: 'Aplicável ao perfil Pessoa Física.',
        position: 2,
        conditionStepId: perguntaTipo.id,
        conditionValue: 'Pessoa Física',
        isRequired: true,
        maxFiles: 1,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.cpf.id,
        title: 'CPF (PF)',
        instructions: 'Envie o CPF do fornecedor pessoa física.',
        position: 3,
        conditionStepId: perguntaTipo.id,
        conditionValue: 'Pessoa Física',
        isRequired: true,
        maxFiles: 1,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.documentosSocietarios.id,
        title: 'Contrato Social ou Requerimento de Empresário',
        instructions:
          'Envie o contrato social consolidado, alterações e última versão registrada na Junta Comercial.',
        helpText: 'Aplicável ao perfil Pessoa Jurídica.',
        position: 4,
        conditionStepId: perguntaTipo.id,
        conditionValue: 'Pessoa Jurídica',
        isRequired: true,
        maxFiles: 3,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.certidoesNegativas.id,
        title: 'Certidões Negativas (PJ)',
        instructions:
          'Certidões negativas de débitos federais, estaduais e trabalhistas da empresa, quando aplicável.',
        position: 5,
        conditionStepId: perguntaTipo.id,
        conditionValue: 'Pessoa Jurídica',
        isRequired: true,
        maxFiles: 5,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.extratoBancario.id,
        title: 'Dados bancários para pagamento',
        instructions:
          'Envie comprovante bancário com agência, conta e titular para cadastro financeiro.',
        position: 6,
        isRequired: true,
        maxFiles: 1,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.certidoesNegativas.id,
        title: 'Certificado de conformidade regulatória',
        instructions:
          'Envie certificados, alvarás ou registros exigidos pelo órgão regulador do seu segmento.',
        position: 7,
        conditionStepId: perguntaRegistro.id,
        conditionValue: 'Sim',
        isRequired: true,
        maxFiles: 3,
        acceptedExtensionsOverride: [],
      },
    ],
  });

  return workflow;
}

async function seedInventarioJudicial(documentTypes: Record<string, { id: string }>) {
  const workflow = await prisma.workflow.upsert({
    where: { slug: 'inventario-judicial' },
    update: {
      name: 'Inventário Judicial: Documentos da Herança',
      description:
        'Coleta de documentos para abertura e instrução de inventário judicial, quando há disputa entre herdeiros, testamento ou herdeiros incapazes.',
      isActive: true,
      isTemplate: false,
      templateCategory: 'inventario',
    },
    create: {
      name: 'Inventário Judicial: Documentos da Herança',
      slug: 'inventario-judicial',
      description:
        'Coleta de documentos para abertura e instrução de inventário judicial, quando há disputa entre herdeiros, testamento ou herdeiros incapazes.',
      isActive: true,
      isTemplate: false,
      templateCategory: 'inventario',
    },
  });

  const existingSteps = await prisma.workflowStep.count({
    where: { workflowId: workflow.id },
  });

  if (existingSteps > 0) {
    return workflow;
  }

  await prisma.workflowStep.createMany({
    data: [
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.certidaoObito.id,
        title: 'Certidão de Óbito',
        instructions:
          'Envie a **certidão de óbito** do autor da herança (de cujus), emitida pelo cartório de registro civil.\n\nEste documento é indispensável para abrir o inventário judicial.',
        helpText: 'Solicite a segunda via no cartório onde o óbito foi registrado, se necessário.',
        position: 0,
        isRequired: true,
        maxFiles: 1,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.rg.id,
        title: 'RG do Falecido',
        instructions:
          'Envie o **RG** do autor da herança (frente e verso).\n\nSe o documento estiver ilegível ou extraviado, consulte o advogado sobre alternativas aceitas pelo juízo.',
        helpText: 'Documento deve estar legível, sem cortes e com foto identificável.',
        position: 1,
        isRequired: true,
        maxFiles: 2,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.cpf.id,
        title: 'CPF do Falecido',
        instructions:
          'Envie o **CPF** do falecido ou comprovante de inscrição emitido pela Receita Federal.',
        helpText: 'Pode ser o cartão do CPF ou consulta atualizada no site da Receita.',
        position: 2,
        isRequired: true,
        maxFiles: 1,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.certidaoCivil.id,
        title: 'Certidão de Casamento ou Nascimento do Falecido',
        instructions:
          'Envie a **certidão de casamento atualizada** (preferencialmente emitida há no máximo 90 dias) ou certidão de nascimento, se solteiro.\n\nO regime de bens informado na certidão define a meação do cônjuge e impacta a partilha.',
        helpText: 'Peça a certidão atualizada no cartório de registro civil.',
        position: 3,
        isRequired: true,
        maxFiles: 1,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.pactoAntenupcial.id,
        title: 'Pacto Antenupcial',
        instructions:
          'Se o falecido era casado sob regime de **separação total ou participação final nos aquestos**, envie a escritura do pacto antenupcial.\n\nSe não houver pacto, pule esta etapa.',
        helpText: 'Etapa opcional. Aplicável apenas quando existir pacto registrado em cartório.',
        position: 4,
        isRequired: false,
        maxFiles: 1,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.declaracaoIr.id,
        title: 'Última Declaração de Imposto de Renda',
        instructions:
          'Envie a **última declaração completa de Imposto de Renda** do falecido (com recibo de entrega).\n\nÉ um dos principais mapas do patrimônio para as primeiras declarações ao juízo.',
        helpText: 'Inclua o recibo de entrega e o demonstrativo de bens e direitos, se disponível.',
        position: 5,
        isRequired: true,
        maxFiles: 3,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.testamento.id,
        title: 'Testamento ou Certidão de Inexistência',
        instructions:
          'Envie o **testamento** registrado, se existir, ou a **certidão de inexistência de testamento** (busca no Colégio Notarial, CENSEC).\n\nA existência de testamento define a via do inventário e a ordem de vocação hereditária.',
        helpText: 'A certidão CENSEC pode ser solicitada por advogado ou tabelião habilitado.',
        position: 6,
        isRequired: true,
        maxFiles: 2,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.certidoesNegativas.id,
        title: 'Certidões Negativas do Falecido',
        instructions:
          'Envie as **certidões negativas** usualmente exigidas no inventário:\n\n- Débitos relativos a créditos tributários federais e dívida ativa da União\n- Débitos trabalhistas (CNDT)\n- Inexistência de dependentes habilitados à pensão por morte (quando aplicável)\n- Outras certidões solicitadas pelo juízo ou pela Fazenda',
        helpText: 'Você pode enviar vários arquivos nesta etapa (uma certidão por arquivo).',
        position: 7,
        isRequired: true,
        maxFiles: 8,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.rg.id,
        title: 'RG do Herdeiro',
        instructions:
          'Envie o **RG** do herdeiro que está enviando a documentação (frente e verso).\n\nEm inventários com disputa, cada herdeiro deve qualificar-se com documentos pessoais atualizados.',
        helpText: 'O nome deve coincidir com as certidões civis apresentadas.',
        position: 8,
        isRequired: true,
        maxFiles: 2,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.cpf.id,
        title: 'CPF do Herdeiro',
        instructions: 'Envie o **CPF** do herdeiro solicitante.',
        helpText: 'Verifique se o número confere com o RG e as certidões civis.',
        position: 9,
        isRequired: true,
        maxFiles: 1,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.certidaoCivil.id,
        title: 'Certidão de Nascimento ou Casamento do Herdeiro',
        instructions:
          'Envie a **certidão de nascimento** ou **certidão de casamento atualizada** do herdeiro.\n\nSe casado, a certidão deve indicar o regime de bens.',
        helpText: 'Divergências de nome entre documentos devem ser regularizadas antes do protocolo.',
        position: 10,
        isRequired: true,
        maxFiles: 1,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.comprovanteResidencia.id,
        title: 'Comprovante de Residência do Herdeiro',
        instructions:
          'Envie comprovante de endereço recente do herdeiro (conta de consumo, extrato bancário ou contrato de locação).',
        helpText: 'Documento com emissão dos últimos 90 dias.',
        position: 11,
        isRequired: true,
        maxFiles: 1,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.interdicao.id,
        title: 'Laudo ou Sentença de Interdição',
        instructions:
          'Se algum herdeiro for **menor incapaz** ou **interditado**, envie a certidão de nascimento do menor, laudo médico ou **sentença de interdição**.\n\nNesses casos o inventário é judicial e o Ministério Público acompanha o processo.',
        helpText: 'Etapa opcional. Obrigatória apenas quando houver herdeiro menor ou incapaz.',
        position: 12,
        isRequired: false,
        maxFiles: 3,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.matriculaImovel.id,
        title: 'Matrícula Atualizada de Imóveis',
        instructions:
          'Envie a **certidão de matrícula atualizada** de cada imóvel do espólio (emitida há no máximo 30 dias).\n\nInclua certidão de **valor venal** e **certidão negativa de débitos imobiliários**, quando já disponíveis.',
        helpText: 'Solicite no Cartório de Registro de Imóveis da comarca do bem.',
        position: 13,
        isRequired: false,
        maxFiles: 10,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.crlv.id,
        title: 'CRLV de Veículos',
        instructions:
          'Envie o **CRLV** (Certificado de Registro e Licenciamento de Veículo) de cada automóvel, moto ou similar integrante do espólio.\n\nSe houver financiamento, inclua o contrato ou extrato do saldo devedor.',
        helpText: 'Consulte a tabela FIPE vigente se o advogado solicitar para avaliação.',
        position: 14,
        isRequired: false,
        maxFiles: 5,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.extratoBancario.id,
        title: 'Extratos Bancários e de Investimentos',
        instructions:
          'Envie **extratos de contas correntes, poupança, investimentos e previdência privada** na data do óbito ou no mês subsequente.\n\nEsses documentos compõem as primeiras declarações e a base de cálculo do ITCMD.',
        helpText: 'Um arquivo por instituição financeira facilita a análise do espólio.',
        position: 15,
        isRequired: false,
        maxFiles: 10,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.documentosSocietarios.id,
        title: 'Documentos Societários',
        instructions:
          'Se o falecido tinha participação em empresas, envie **contrato social**, **alterações contratuais** e **certidão simplificada da Junta Comercial** (ou equivalente).',
        helpText: 'Etapa opcional. Aplicável quando houver quotas ou ações no espólio.',
        position: 16,
        isRequired: false,
        maxFiles: 8,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.comprovanteDivida.id,
        title: 'Comprovantes de Dívidas do Espólio',
        instructions:
          'Envie documentos de **dívidas e obrigações** do falecido (empréstimos, financiamentos, cartões, tributos em aberto) para composição do passivo do espólio.',
        helpText: 'Dívidas também integram as primeiras declarações apresentadas ao juízo.',
        position: 17,
        isRequired: false,
        maxFiles: 10,
        acceptedExtensionsOverride: [],
      },
      {
        workflowId: workflow.id,
        documentTypeId: documentTypes.procuracao.id,
        title: 'Procuração ao Advogado',
        instructions:
          'Envie a **procuração** outorgada ao advogado com poderes para representar o herdeiro no inventário judicial.\n\nO advogado é obrigatório nesta modalidade de inventário.',
        helpText: 'A procuração pode ser assinada em cartório ou com reconhecimento de firma.',
        position: 18,
        isRequired: true,
        maxFiles: 1,
        acceptedExtensionsOverride: [],
      },
    ],
  });

  return workflow;
}

async function main() {
  const rg = await upsertDocumentType({
    id: '00000000-0000-0000-0000-000000000001',
    name: 'RG',
    description: 'Documento de identidade (Registro Geral)',
    icon: 'badge',
  });

  const cpf = await upsertDocumentType({
    id: '00000000-0000-0000-0000-000000000002',
    name: 'CPF',
    description: 'Cadastro de Pessoa Física',
    icon: 'person',
  });

  const comprovanteResidencia = await upsertDocumentType({
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Comprovante de Residência',
    description: 'Conta de luz, água, telefone ou extrato bancário',
    icon: 'home',
  });

  const certidaoObito = await upsertDocumentType({
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Certidão de Óbito',
    description: 'Certidão de registro de óbito emitida pelo cartório de registro civil',
    icon: 'description',
  });

  const certidaoCivil = await upsertDocumentType({
    id: '00000000-0000-0000-0000-000000000005',
    name: 'Certidão Civil',
    description: 'Certidão de nascimento ou casamento atualizada',
    icon: 'family_restroom',
  });

  const pactoAntenupcial = await upsertDocumentType({
    id: '00000000-0000-0000-0000-000000000006',
    name: 'Pacto Antenupcial',
    description: 'Escritura de pacto antenupcial registrada em cartório',
    icon: 'gavel',
  });

  const declaracaoIr = await upsertDocumentType({
    id: '00000000-0000-0000-0000-000000000007',
    name: 'Declaração de Imposto de Renda',
    description: 'Última declaração completa de IR com recibo de entrega',
    icon: 'receipt_long',
  });

  const testamento = await upsertDocumentType({
    id: '00000000-0000-0000-0000-000000000008',
    name: 'Testamento / Certidão CENSEC',
    description: 'Testamento registrado ou certidão de inexistência de testamento',
    icon: 'article',
  });

  const certidoesNegativas = await upsertDocumentType({
    id: '00000000-0000-0000-0000-000000000009',
    name: 'Certidões Negativas',
    description: 'Certidões negativas de débitos federais, trabalhistas e outras exigidas no inventário',
    icon: 'verified',
  });

  const matriculaImovel = await upsertDocumentType({
    id: '00000000-0000-0000-0000-000000000010',
    name: 'Matrícula de Imóvel',
    description: 'Certidão de matrícula atualizada e documentos correlatos do imóvel',
    icon: 'apartment',
  });

  const crlv = await upsertDocumentType({
    id: '00000000-0000-0000-0000-000000000011',
    name: 'CRLV',
    description: 'Certificado de Registro e Licenciamento de Veículo',
    icon: 'directions_car',
  });

  const extratoBancario = await upsertDocumentType({
    id: '00000000-0000-0000-0000-000000000012',
    name: 'Extrato Bancário',
    description: 'Extratos de contas e investimentos na data do óbito ou período próximo',
    icon: 'account_balance',
  });

  const documentosSocietarios = await upsertDocumentType({
    id: '00000000-0000-0000-0000-000000000013',
    name: 'Documentos Societários',
    description: 'Contrato social, alterações e certidões de participação em empresas',
    icon: 'business',
  });

  const comprovanteDivida = await upsertDocumentType({
    id: '00000000-0000-0000-0000-000000000014',
    name: 'Comprovante de Dívida',
    description: 'Contratos, boletos ou extratos de dívidas e obrigações do espólio',
    icon: 'payments',
  });

  const procuracao = await upsertDocumentType({
    id: '00000000-0000-0000-0000-000000000015',
    name: 'Procuração',
    description: 'Procuração outorgada ao advogado para atuação no inventário',
    icon: 'draw',
  });

  const interdicao = await upsertDocumentType({
    id: '00000000-0000-0000-0000-000000000016',
    name: 'Laudo ou Sentença de Interdição',
    description: 'Documentos de herdeiro menor ou incapaz para acompanhamento do Ministério Público',
    icon: 'health_and_safety',
  });

  const documentTypes = {
    rg,
    cpf,
    comprovanteResidencia,
    certidaoObito,
    certidaoCivil,
    pactoAntenupcial,
    declaracaoIr,
    testamento,
    certidoesNegativas,
    matriculaImovel,
    crlv,
    extratoBancario,
    documentosSocietarios,
    comprovanteDivida,
    procuracao,
    interdicao,
  };

  const aberturaConta = await seedAberturaConta(documentTypes);
  const inventarioJudicial = await seedInventarioJudicial(documentTypes);
  const templateCadastroFornecedor = await seedTemplateCadastroFornecedor(documentTypes);

  console.log('Seed completed:', {
    workflows: [aberturaConta.slug, inventarioJudicial.slug],
    templates: [templateCadastroFornecedor.slug],
    documentTypes: Object.keys(documentTypes).length,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
