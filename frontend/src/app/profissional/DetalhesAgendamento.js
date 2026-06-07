import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/api';

// Paleta de cores premium unificada
const CREAM = '#FDFBF7';        
const VERDE_VIVO = '#2E6F40';   
const PETROLEO = '#0F262E';     
const TEXT_MID = '#768A7E';     
const BORDER = '#E3E8E5';       
const WHITE = '#FFFFFF';
const RED = '#C94A4A';
const GOLD = '#E6A119';

export default function DetalhesAgendamentoProfissional() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [agendamento, setAgendamento] = useState(null);

  // Função para buscar dados
  const fetchDetalhes = async () => {
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          cliente:id_cliente ( nome_usuario, telefone ),
          profissional:id_profissional ( 
            id_profissional,
            usuario:id_usuario ( nome_usuario ) 
          ),
          servico:id_servico ( nome_servico )
        `)
        .eq('id_agendamento', id)
        .single();

      if (error) throw error;
      setAgendamento(data);
    } catch (error) {
      console.error("Erro ao buscar detalhes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetalhes();

    // CONFIGURAÇÃO DO REALTIME
    const canal = supabase
      .channel(`prof_realtime_${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agendamentos', filter: `id_agendamento=eq.${id}` },
        (payload) => {
          console.log("Mudança detectada no banco:", payload);
          fetchDetalhes(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [id]);

  const atualizarStatus = async (coluna, valor) => {
    try {
      setAgendamento(prev => ({ ...prev, [coluna]: valor }));

      const { error } = await supabase
        .from('agendamentos')
        .update({ [coluna]: valor })
        .eq('id_agendamento', id);
      
      if (error) throw error;
    } catch (error) {
      Alert.alert("Erro", "Falha ao atualizar status.");
      fetchDetalhes(); 
    }
  };

  // --- FUNÇÃO PARA ABRIR INTERCORRÊNCIA ---
  const abrirIntercorrencia = () => {
    router.push({
      pathname: '/criar_intercorrencia',
      params: {
        id_agendamento: agendamento.id_agendamento,
        aberto_por: agendamento.profissional?.usuario?.nome_usuario || 'Profissional',
        contra_quem: agendamento.cliente?.nome_usuario || 'Cliente',
        nome_servico: agendamento.servico?.nome_servico,
        tipo_usuario: 'profissional'
      }
    });
  };

  const getStatusAtendimento = () => {
    if (!agendamento) return { texto: "", cor: PETROLEO, bg: CREAM, icon: "ellipse-outline" };
    const { presenca_cliente, presenca_profissional, finalizado_cliente, finalizado_profissional } = agendamento;
    
    if (finalizado_cliente && finalizado_profissional) 
      return { texto: "Finalizado", cor: VERDE_VIVO, bg: '#EBF7EE', icon: "checkmark-done" };
    if (finalizado_cliente || finalizado_profissional) 
      return { texto: "Aguardando Outra Parte", cor: PETROLEO, bg: '#ECEFF1', icon: "hourglass-outline" };
    if (presenca_cliente && presenca_profissional) 
      return { texto: "Em Andamento", cor: '#3F51B5', bg: '#E8EAF6', icon: "play-circle-outline" };
    if (presenca_cliente || presenca_profissional) 
      return { texto: "Confirmado", cor: VERDE_VIVO, bg: '#EBF7EE', icon: "checkmark-circle-outline" };
      
    return { texto: "Aguardando Confirmação", cor: GOLD, bg: '#FFFDE7', icon: "alert-circle-outline" };
  };

  const getStatusPagamento = () => {
    if (!agendamento) return "Aguardando Status";
    const { pagamento_cliente, pagamento_profissional } = agendamento;

    if (pagamento_cliente && pagamento_profissional) return "Recebimento Confirmado ✅";
    if (pagamento_cliente && !pagamento_profissional) return "Pagamento Informado pelo Cliente 🔔";
    if (!pagamento_cliente && pagamento_profissional) return "Recebimento Confirmado (Manual) ✅";
    return "Aguardando Pagamento ⏳";
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={VERDE_VIVO} /></View>;

  const statusAtend = getStatusAtendimento();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* TOPO: VOLTAR */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={PETROLEO} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>

        {/* HEADER DO DETALHE */}
        <Text style={styles.titleTitle}>Painel do Atendimento</Text>
        <Text style={styles.title}>{agendamento.servico?.nome_servico}</Text>

        {/* CARD INFORMATIVO PRINCIPAL */}
        <View style={styles.cardDetails}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color={VERDE_VIVO} />
            <View style={styles.textContainer}>
              <Text style={styles.infoLabel}>Cliente</Text>
              <Text style={styles.infoValue}>{agendamento.cliente?.nome_usuario}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={VERDE_VIVO} />
            <View style={styles.textContainer}>
              <Text style={styles.infoLabel}>Horário do Atendimento</Text>
              <Text style={styles.infoValue}>{agendamento.hora_agendamento}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={VERDE_VIVO} />
            <View style={styles.textContainer}>
              <Text style={styles.infoLabel}>Local da Consulta</Text>
              <Text style={styles.infoValue}>{agendamento.endereco}</Text>
            </View>
          </View>
        </View>

        {/* SECÇÃO STATUS DO ATENDIMENTO */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Status do Fluxo</Text>
          
          <View style={styles.statusBox}>
            <Text style={styles.statusIndicatorText}>
              Sua chegada: <Text style={agendamento.presenca_profissional ? styles.valueActive : styles.valuePending}>{agendamento.presenca_profissional ? "Confirmado" : "Pendente"}</Text>
            </Text>
            <Text style={[styles.statusIndicatorText, { marginTop: 4 }]}>
              Cliente em local: <Text style={agendamento.presenca_cliente ? styles.valueActive : styles.valuePending}>{agendamento.presenca_cliente ? "Confirmado" : "Pendente"}</Text>
            </Text>
          </View>

          {/* BADGE CENTRAL DE STATUS */}
          <View style={[styles.mainStatusBadge, { backgroundColor: statusAtend.bg }]}>
            <Ionicons name={statusAtend.icon} size={18} color={statusAtend.cor} />
            <Text style={[styles.mainStatusText, { color: statusAtend.cor }]}>{statusAtend.texto}</Text>
          </View>
        </View>

        {/* BOTÕES DE AÇÃO DO ATENDIMENTO */}
        <View style={styles.actionsContainer}>
          {!agendamento.presenca_profissional ? (
            <TouchableOpacity style={styles.btnConfirmar} onPress={() => atualizarStatus('presenca_profissional', true)}>
              <Ionicons name="navigate-outline" size={20} color={WHITE} style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Confirmar Minha Chegada</Text>
            </TouchableOpacity>
          ) : !agendamento.finalizado_profissional ? (
            <TouchableOpacity style={styles.btnConfirmar} onPress={() => atualizarStatus('finalizado_profissional', true)}>
              <Ionicons name="checkmark-done" size={20} color={WHITE} style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Marcar como Concluído</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.centerFeedback}>
              <Ionicons name="hourglass-outline" size={32} color={TEXT_MID} />
              <Text style={styles.feedbackText}>Você concluiu o procedimento. Aguardando encerramento do cliente.</Text>
            </View>
          )}
        </View>

        {/* SECÇÃO PAGAMENTO */}
        <View style={styles.sectionContainer}>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Validação de Repasse</Text>
          <View style={styles.paymentBadge}>
            <Ionicons name="cash-outline" size={16} color={PETROLEO} />
            <Text style={styles.paymentStatusText}>{getStatusPagamento()}</Text>
          </View>
          
          {!agendamento.pagamento_profissional && (
            <TouchableOpacity style={[styles.btnConfirmar, { marginTop: 14, backgroundColor: GOLD }]} onPress={() => atualizarStatus('pagamento_profissional', true)}>
              <Ionicons name="wallet-outline" size={18} color={WHITE} style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Confirmar Recebimento</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SECÇÃO DE INTERCORRÊNCIA */}
        <View style={styles.intercorrenciaSection}>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.btnIntercorrencia} onPress={abrirIntercorrencia}>
            <Ionicons name="warning-outline" size={20} color={WHITE} />
            <Text style={styles.btnIntercorrenciaText}>Relatar Problema / Disputa</Text>
          </TouchableOpacity>
          <Text style={styles.helpText}>Use este canal exclusivo de suporte caso o cliente não compareça ou haja alguma divergência direta nos valores/procedimento.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: CREAM 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: CREAM 
  },
  scrollContent: { 
    paddingHorizontal: 24, 
    paddingTop: 20,
    paddingBottom: 40 
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 4,
  },
  backButtonText: {
    color: PETROLEO,
    fontSize: 16,
    fontWeight: '500',
  },
  titleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_MID,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4
  },
  title: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: PETROLEO,
    letterSpacing: -0.5,
    marginBottom: 20
  },
  cardDetails: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: BORDER,
    shadowColor: PETROLEO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16,
    gap: 12
  },
  textContainer: {
    flex: 1
  },
  infoLabel: { 
    fontSize: 11, 
    color: TEXT_MID,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600'
  },
  infoValue: { 
    fontSize: 16,
    color: PETROLEO,
    fontWeight: '600',
    marginTop: 1
  },
  sectionContainer: {
    marginBottom: 20
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: PETROLEO, 
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  statusBox: {
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12
  },
  statusIndicatorText: {
    fontSize: 14,
    color: PETROLEO,
    fontWeight: '500'
  },
  valueActive: {
    color: VERDE_VIVO,
    fontWeight: '700'
  },
  valuePending: {
    color: GOLD,
    fontWeight: '700'
  },
  mainStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  mainStatusText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  actionsContainer: {
    marginVertical: 10
  },
  btnConfirmar: { 
    backgroundColor: VERDE_VIVO, 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center', 
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: VERDE_VIVO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  btnText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: WHITE,
    letterSpacing: 0.3
  },
  centerFeedback: {
    alignItems: 'center',
    backgroundColor: WHITE,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8
  },
  feedbackText: {
    fontSize: 13,
    color: TEXT_MID,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 18
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8,
    alignSelf: 'flex-start'
  },
  paymentStatusText: {
    fontSize: 14,
    color: PETROLEO,
    fontWeight: '600'
  },
  divider: { 
    height: 1, 
    backgroundColor: BORDER, 
    width: '100%', 
    marginVertical: 20 
  },
  intercorrenciaSection: { 
    alignItems: 'center',
    marginTop: 10
  },
  btnIntercorrencia: { 
    flexDirection: 'row', 
    backgroundColor: RED, 
    paddingVertical: 14, 
    paddingHorizontal: 16,
    borderRadius: 12, 
    alignItems: 'center', 
    width: '100%', 
    justifyContent: 'center',
    gap: 8,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  btnIntercorrenciaText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: WHITE 
  },
  helpText: { 
    fontSize: 12, 
    color: TEXT_MID, 
    textAlign: 'center', 
    marginTop: 10, 
    lineHeight: 18,
    paddingHorizontal: 10
  }
});