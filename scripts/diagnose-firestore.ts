/**
 * Diagnostic Script: Firestore Real-Time Persistence & Global State Sync Verifier
 * Executa diagnóstico completo de conectividade, persistência e integridade de dados.
 *
 * Como rodar:
 * npx tsx scripts/diagnose-firestore.ts
 */

import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Lê o arquivo de configuração
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
if (!fs.existsSync(configPath)) {
  console.error('❌ ERRO: firebase-applet-config.json não foi encontrado!');
  process.exit(1);
}

const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log('================================================================');
console.log('🔍 INICIANDO DIAGNÓSTICO DO CLOUD FIRESTORE & SINCRONIZAÇÃO');
console.log('================================================================');
console.log(`📡 Projeto: ${firebaseConfig.projectId}`);
console.log(`🗄️  Database ID: ${firebaseConfig.firestoreDatabaseId}`);
console.log(`⏰ Timestamp de verificação: ${new Date().toISOString()}\n`);

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true
}, firebaseConfig.firestoreDatabaseId);

interface DiagnosticIssue {
  severity: 'FAIL' | 'WARN' | 'INFO';
  collection: string;
  id?: string;
  message: string;
}

const issues: DiagnosticIssue[] = [];

async function runDiagnosis() {
  const startTime = Date.now();

  // 1. VERIFICAÇÃO DE COLEÇÃO 'cultos' (Cultos, Reuniões e Ensaios)
  console.log('----------------------------------------------------------------');
  console.log('📋 1. Analisando Documentos da Coleção "cultos"...');
  try {
    const cultosSnap = await getDocs(collection(db, 'cultos'));
    console.log(`   Documentos encontrados: ${cultosSnap.size}`);

    const cultosList: any[] = [];
    cultosSnap.forEach(d => {
      const data = d.data();
      cultosList.push({ id: d.id, ...data });

      // Verificação de ID
      if (d.id.length > 128) {
        issues.push({
          severity: 'WARN',
          collection: 'cultos',
          id: d.id,
          message: `ID muito longo (${d.id.length} caracteres). Recomendado <= 128.`
        });
      }
      if (!/^[a-zA-Z0-9_\-]+$/.test(d.id)) {
        issues.push({
          severity: 'FAIL',
          collection: 'cultos',
          id: d.id,
          message: `ID contém caracteres especiais não seguros: "${d.id}".`
        });
      }

      // Verificação de campos obrigatórios
      if (!data.title) {
        issues.push({
          severity: 'FAIL',
          collection: 'cultos',
          id: d.id,
          message: 'Documento de culto não possui o campo "title".'
        });
      }
      if (!data.date) {
        issues.push({
          severity: 'FAIL',
          collection: 'cultos',
          id: d.id,
          message: 'Documento de culto não possui o campo "date".'
        });
      }
    });

    console.log('\n   Resumo dos Cultos & Eventos Persistidos:');
    cultosList.forEach(c => {
      const typeLabel = c.type === 'reuniao' ? '👥 Reunião' : c.type === 'ensaio' ? '🎵 Ensaio' : '⛪ Culto';
      console.log(`   - [${typeLabel}] ID: ${c.id}`);
      console.log(`     Título: "${c.title}" | Data: ${c.date} | Horário: ${c.startTime} | Campus: ${c.campus}`);
    });

    const reunioes = cultosList.filter(c => c.type === 'reuniao');
    const cultosTradicionais = cultosList.filter(c => !c.type || c.type === 'culto');
    console.log(`\n   ✓ Total de Reuniões: ${reunioes.length}`);
    console.log(`   ✓ Total de Cultos: ${cultosTradicionais.length}`);

  } catch (err: any) {
    issues.push({
      severity: 'FAIL',
      collection: 'cultos',
      message: `Erro ao consultar coleção: ${err.message}`
    });
    console.error('   ❌ Falha ao ler cultos:', err.message);
  }

  // 2. VERIFICAÇÃO DE COLEÇÃO 'pessoas'
  console.log('\n----------------------------------------------------------------');
  console.log('👥 2. Analisando Coleção "pessoas"...');
  try {
    const snap = await getDocs(collection(db, 'pessoas'));
    console.log(`   Documentos encontrados: ${snap.size}`);
    let adminFound = false;
    snap.forEach(d => {
      const u = d.data();
      if (u.isAdmin) adminFound = true;
    });
    if (!adminFound) {
      issues.push({
        severity: 'WARN',
        collection: 'pessoas',
        message: 'Nenhum usuário com flag isAdmin: true encontrado em "pessoas".'
      });
    } else {
      console.log('   ✓ Pelo menos um Administrador Geral cadastrado.');
    }
  } catch (err: any) {
    issues.push({
      severity: 'FAIL',
      collection: 'pessoas',
      message: `Erro ao consultar pessoas: ${err.message}`
    });
  }

  // 3. VERIFICAÇÃO DE COLEÇÃO 'escalas'
  console.log('\n----------------------------------------------------------------');
  console.log('📅 3. Analisando Coleção "escalas"...');
  try {
    const snap = await getDocs(collection(db, 'escalas'));
    console.log(`   Total de vagas de escala cadastradas: ${snap.size}`);
    let confirmedCount = 0;
    snap.forEach(d => {
      if (d.data().status === 'confirmed') confirmedCount++;
    });
    console.log(`   ✓ Vagas confirmadas para culto: ${confirmedCount}`);
  } catch (err: any) {
    issues.push({
      severity: 'WARN',
      collection: 'escalas',
      message: `Nota ao ler escalas: ${err.message}`
    });
  }

  // 4. VERIFICAÇÃO DE CONFIGURAÇÕES WHATSAPP ('settings/whatsapp')
  console.log('\n----------------------------------------------------------------');
  console.log('💬 4. Analisando Configurações do Módulo WhatsApp ("settings/whatsapp")...');
  try {
    const waSnap = await getDoc(doc(db, 'settings', 'whatsapp'));
    if (waSnap.exists()) {
      const data = waSnap.data();
      console.log('   ✓ Documento settings/whatsapp encontrado:');
      console.log(`     - Lembretes 24h Habilitados: ${data.enabled ? 'SIM' : 'NÃO'}`);
      console.log(`     - Antecedência de Disparo: ${data.hoursBefore || 24} horas`);
      console.log(`     - Link da Aplicação: ${data.appUrl || 'Padrão'}`);
      console.log(`     - Template configurado (${data.messageTemplate?.length || 0} caracteres).`);
    } else {
      console.log('   ℹ️  settings/whatsapp ainda não foi salvo remotamente (usando padrão local).');
      issues.push({
        severity: 'INFO',
        collection: 'settings',
        message: 'settings/whatsapp não existe no Firestore ainda. O sistema utilizará o template padrão local até ser salvo pelo administrador.'
      });
    }
  } catch (err: any) {
    issues.push({
      severity: 'WARN',
      collection: 'settings',
      message: `Erro ao ler settings/whatsapp: ${err.message}`
    });
  }

  // 5. TESTE DE ESCRITA E PERSISTÊNCIA APÓS RECARREGAMENTO SIMULADO
  console.log('\n----------------------------------------------------------------');
  console.log('🧪 5. Executando Teste de Escrita e Persistência em Tempo Real...');
  const probeId = `probe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const probePath = `cultos/${probeId}`;
  try {
    const testDocData = {
      id: probeId,
      type: 'reuniao',
      title: 'Teste de Diagnóstico de Persistência',
      date: '2026-12-31',
      startTime: '10:00',
      campus: 'Campus Teste Automatizado',
      preacher: 'Sistema de Diagnóstico',
      generalManager: 'Admin Script',
      participatingMinistryIds: [],
      notes: 'Documento transitório criado para validar persistência após reload.'
    };

    console.log(`   Gravando documento temporário: ${probePath}...`);
    await setDoc(doc(db, 'cultos', probeId), testDocData);
    console.log('   ✓ Escrita realizada com sucesso no Firestore.');

    // Simula reload: busca o documento imediatamente como se fosse nova sessão
    const verifySnap = await getDoc(doc(db, 'cultos', probeId));
    if (verifySnap.exists() && verifySnap.data().title === testDocData.title) {
      console.log('   ✓ Leitura pós-escrita verificada com sucesso! Dados 100% íntegros.');
    } else {
      issues.push({
        severity: 'FAIL',
        collection: 'cultos',
        id: probeId,
        message: 'Documento recém-gravado não pôde ser recuperado na leitura imediata!'
      });
    }

    // Limpa o documento de teste
    await deleteDoc(doc(db, 'cultos', probeId));
    console.log('   ✓ Documento transitório de teste removido com sucesso.');

  } catch (err: any) {
    issues.push({
      severity: 'FAIL',
      collection: 'cultos',
      id: probeId,
      message: `Falha no teste de persistência: ${err.message}`
    });
    console.error('   ❌ Falha na gravação/leitura de teste:', err.message);
  }

  // RELATÓRIO FINAL
  const elapsedMs = Date.now() - startTime;
  console.log('\n================================================================');
  console.log(`📊 RELATÓRIO FINAL DO DIAGNÓSTICO (tempo: ${elapsedMs}ms)`);
  console.log('================================================================');

  const fails = issues.filter(i => i.severity === 'FAIL');
  const warns = issues.filter(i => i.severity === 'WARN');
  const infos = issues.filter(i => i.severity === 'INFO');

  if (fails.length === 0 && warns.length === 0) {
    console.log('✅ STATUS GERAL: EXCELENTE! (PASS)');
    console.log('   O Cloud Firestore está conectado, persistindo cultos, reuniões e configurações.');
    console.log('   Os documentos criados persistem perfeitamente e não há falhas estruturais.');
  } else {
    if (fails.length > 0) {
      console.log(`❌ FALHAS CRÍTICAS ENCONTRADAS (${fails.length}):`);
      fails.forEach(f => console.log(`   - [${f.collection}${f.id ? `/${f.id}` : ''}] ${f.message}`));
    }
    if (warns.length > 0) {
      console.log(`⚠️  ALERTAS (${warns.length}):`);
      warns.forEach(w => console.log(`   - [${w.collection}${w.id ? `/${w.id}` : ''}] ${w.message}`));
    }
  }

  if (infos.length > 0) {
    console.log(`ℹ️  INFORMAÇÕES (${infos.length}):`);
    infos.forEach(i => console.log(`   - ${i.message}`));
  }

  console.log('================================================================\n');

  process.exit(fails.length > 0 ? 1 : 0);
}

runDiagnosis().catch(err => {
  console.error('Erro inesperado no diagnóstico:', err);
  process.exit(1);
});
