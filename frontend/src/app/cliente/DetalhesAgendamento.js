//DetalhesAgendameno_cliente
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

export default function DetalhesAgendamento() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [agendamento, setAgendamento] = useState(null);
  const [nota, setNota] = useState(0); 
  const [avaliadoLocal, setAvaliadoLocal] = useState(false);
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [mostrarAvaliacao, setMostrarAvaliacao] = useState(false);

  useEffect(() => {
    fetchDetalhes();

    const subscription = supabase
      .channel(`agendamento_cliente_${id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'agendamentos', 
          filter: `id_agendamento=eq.${id}` 
        },
        () => {
          fetchDetalhes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  const fetchDetalhes = async () => {
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          cliente:id_cliente ( nome_usuario ),
          profissional:id_profissional ( 
            id_profissional,
            usuario:id_usuario (nome_usuario) 
          ),
          servico:id_servico ( nome_servico )
        `)
        .eq('id_agendamento', id)
        .single();

      if (error) throw error;
      setAgendamento(data);
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
    } finally {
      setLoading(false);
    }
  };

  const enviarAvaliacao = async () => {
    if (nota === 0) {
      Alert.alert("Aviso", "Selecione uma estrela antes de enviar.");
      return;
    }

    try {
      setEnviandoAvaliacao(true);
      
      const { data: prof, error: profError } = await supabase
        .from('profissional')
        .select('media_avaliacao, total_avaliacoes')
        .eq('id_profissional', agendamento.id_profissional)
        .single();

      if (profError) throw profError;

      const qtdAnterior = prof.total_avaliacoes || 0;
      const mediaAtual = prof.media_avaliacao || 0;
      const novaQtd = qtdAnterior + 1;
      const novaMedia = ((mediaAtual * qtdAnterior) + nota) / novaQtd;

      await supabase
        .from('profissional')
        .update({ media_avaliacao: novaMedia, total_avaliacoes: novaQtd })
        .eq('id_profissional', agendamento.id_profissional);

      const { data: userData } = await supabase
        .from('usuario')
        .select('servicos_recebidos')
        .eq('id_usuario', agendamento.id_cliente)
        .single();

      await supabase
        .from('usuario')
        .update({ servicos_recebidos: (userData?.servicos_recebidos || 0) + 1 })
        .eq('id_usuario', agendamento.id_cliente);

      const { error: updateAgendError } = await supabase
        .from('agendamentos')
        .update({ finalizado_cliente: true })
        .eq('id_agendamento', id);

      if (updateAgendError) throw updateAgendError;

      setAvaliadoLocal(true);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível processar sua avaliação.");
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

  const getStatusAtendimento = () => {
    if (!agendamento) return { texto: "", cor: PETROLEO, bg: CREAM, icon: "ellipse-outline" };
    const { presenca_cliente, presenca_profissional, finalizado_cliente, finalizado_profissional } = agendamento;
    
    if (finalizado_cliente && finalizado_profissional) 
      return { texto: "Finalizado", cor: VERDE_VIVO, bg: '#EBF7EE', icon: "checkmark-done" };
    if (finalizado_cliente || finalizado_profissional) 
      return { texto: "Aguardando Finalização", cor: PETROLEO, bg: '#ECEFF1', icon: "hourglass-outline" };
    if (presenca_cliente && presenca_profissional) 
      return { texto: "Em Andamento", cor: '#3F51B5', bg: '#E8EAF6', icon: "play-circle-outline" };
    if (presenca_cliente || presenca_profissional) 
      return { texto: "Confirmado", cor: VERDE_VIVO, bg: '#EBF7EE', icon: "checkmark-circle-outline" };
      
    return { texto: "Aguardando Confirmação", cor: GOLD, bg: '#FFFDE7', icon: "alert-circle-outline" };
  };

  const getStatusPagamento = () => {
    if (!agendamento) return "Aguardando Status";
    const { pagamento_cliente, pagamento_profissional } = agendamento;
    if (pagamento_cliente && pagamento_profissional) return "Pagamento Concluído";
    if (pagamento_cliente) return "Pagamento Informado por Você";
    if (pagamento_profissional) return "Pagamento Informado pelo Profissional";
    return "Aguardando Confirmação de Pagamento";
  };

  const atualizarStatus = async (coluna, valor) => {
    try {
      setAgendamento(prev => ({ ...prev, [coluna]: valor }));
      const { error } = await supabase.from('agendamentos').update({ [coluna]: valor }).eq('id_agendamento', id);
      if (error) {
        fetchDetalhes();
        throw error;
      }
    } catch (error) {
      Alert.alert("Erro", "Falha ao atualizar status.");
    }
  };

  const abrirIntercorrencia = () => {
    router.push({
      pathname: '/criar_intercorrencia',
      params: {
        id_agendamento: agendamento.id_agendamento,
        aberto_por: agendamento.cliente?.nome_usuario || 'Cliente',
        contra_quem: agendamento.profissional?.usuario?.nome_usuario || 'Profissional',
        nome_servico: agendamento.servico?.nome_servico,
        tipo_usuario: 'cliente'
      }
    });
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={VERDE_VIVO} /></View>;

  const statusAtend = getStatusAtendimento();
  const pagamentoConcluido = agendamento.pagamento_cliente && agendamento.pagamento_profissional;

  // --- TELA DE AVALIAÇÃO ---
  if (mostrarAvaliacao && !avaliadoLocal) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setMostrarAvaliacao(false)}>
            <Ionicons name="arrow-back" size={22} color={PETROLEO} />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.evalContainer}>
          <Text style={styles.titleCentred}>Avaliar Procedimento</Text>
          <Text style={styles.evalText}>Como foi seu atendimento com <Text style={{fontWeight: '700', color: PETROLEO}}>{agendamento.profissional?.usuario?.nome_usuario}</Text>?</Text>
          
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setNota(star)} style={{ marginHorizontal: 6 }}>
                <Ionicons name={nota >= star ? "star" : "star-outline"} size={44} color={GOLD} />
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity style={styles.btnConfirmar} onPress={enviarAvaliacao} disabled={enviandoAvaliacao}>
            {enviandoAvaliacao ? <ActivityIndicator color={WHITE} /> : <Text style={styles.btnText}>Confirmar e Finalizar</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- TELA SUCESSO FINALIZADO ---
  if (avaliadoLocal) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
         <Ionicons name="checkmark-circle-outline" size={100} color={VERDE_VIVO} />
         <Text style={styles.successText}>Atendimento Finalizado!</Text>
         <TouchableOpacity style={styles.btnVoltar} onPress={() => router.replace('/cliente/dashboard')}>
            <Text style={styles.btnText}>Voltar ao Início</Text>
         </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* TOPO: VOLTAR */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={PETROLEO} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>

        {/* HEADER DO DETALHE */}
        <Text style={styles.title}>{agendamento.servico?.nome_servico}</Text>
        
        {/* CARD INFORMATIVO PRINCIPAL */}
        <View style={styles.cardDetails}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color={VERDE_VIVO} />
            <View style={styles.textContainer}>
              <Text style={styles.infoLabel}>Profissional</Text>
              <Text style={styles.infoValue}>{agendamento.profissional?.usuario?.nome_usuario}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={VERDE_VIVO} />
            <View style={styles.textContainer}>
              <Text style={styles.infoLabel}>Horário Marcado</Text>
              <Text style={styles.infoValue}>{agendamento.hora_agendamento}</Text>
            </View>
          </View>
        </View>

        {/* SECÇÃO STATUS DO ATENDIMENTO */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Status Do Atendimento</Text>
          
          <View style={styles.statusBox}>
            <Text style={styles.statusIndicatorText}>
              Sua confirmação: <Text style={agendamento.presenca_cliente ? styles.valueActive : styles.valuePending}>{agendamento.presenca_cliente ? "Confirmado" : "Pendente"}</Text>
            </Text>
            <Text style={[styles.statusIndicatorText, { marginTop: 4 }]}>
              Profissional: <Text style={agendamento.presenca_profissional ? styles.valueActive : styles.valuePending}>{agendamento.presenca_profissional ? "Confirmado" : "Pendente"}</Text>
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
          {!agendamento.presenca_cliente ? (
            <TouchableOpacity style={styles.btnConfirmar} onPress={() => atualizarStatus('presenca_cliente', true)}>
              <Ionicons name="checkmark" size={20} color={WHITE} style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Confirmar Presença</Text>
            </TouchableOpacity>
          ) : !agendamento.finalizado_cliente ? (
            <TouchableOpacity 
              style={styles.btnConfirmar} 
              onPress={() => {
                if(!pagamentoConcluido) {
                    Alert.alert("Aviso", "Confirme o pagamento antes de finalizar.");
                } else {
                    setMostrarAvaliacao(true);
                }
              }}
            >
              <Ionicons name="lock-open-outline" size={20} color={WHITE} style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Marcar como Finalizado</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* SECÇÃO PAGAMENTO */}
        <View style={styles.sectionContainer}>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Pagamento</Text>
          <View style={styles.paymentBadge}>
            <Ionicons name="card-outline" size={16} color={PETROLEO} />
            <Text style={styles.paymentStatusText}>{getStatusPagamento()}</Text>
          </View>
          
          {!agendamento.pagamento_cliente && (
            <TouchableOpacity style={[styles.btnConfirmar, { marginTop: 14 }]} onPress={() => atualizarStatus('pagamento_cliente', true)}>
              <Text style={styles.btnText}>Informar Pagamento Efetuado</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SECÇÃO DE INTERCORRÊNCIA */}
        <View style={styles.intercorrenciaSection}>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.btnIntercorrencia} onPress={abrirIntercorrencia}>
            <Ionicons name="warning-outline" size={20} color={WHITE} />
            <Text style={styles.btnIntercorrenciaText}>Tive um problema / Abrir Intercorrência</Text>
          </TouchableOpacity>
          <Text style={styles.helpText}>Use este canal caso o atendimento não tenha ocorrido ou haja alguma quebra de termos.</Text>
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
  title: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: PETROLEO,
    letterSpacing: -0.5,
    marginBottom: 20
  },
  titleCentred: {
    fontSize: 24, 
    fontWeight: '700', 
    color: PETROLEO,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 10
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
  btnVoltar: { 
    backgroundColor: PETROLEO, 
    paddingVertical: 14, 
    width: '70%', 
    borderRadius: 12, 
    alignItems: 'center',
    marginTop: 10
  },
  btnText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: WHITE,
    letterSpacing: 0.3
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
  evalContainer: { 
    flex: 1, 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    justifyContent: 'center' 
  },
  evalText: { 
    fontSize: 15, 
    color: TEXT_MID, 
    textAlign: 'center', 
    marginBottom: 32,
    lineHeight: 22
  },
  starsRow: { 
    flexDirection: 'row', 
    marginBottom: 40 
  },
  successText: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: PETROLEO,
    marginTop: 16,
    marginBottom: 12
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