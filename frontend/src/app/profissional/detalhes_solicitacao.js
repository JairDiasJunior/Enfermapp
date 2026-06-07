import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/api';

// ─── PALETA DESIGN SYSTEM ────────────────────────────────────────────────────
const PETROLEO      = '#1B4D4D';
const PETROLEO_VIVO = '#2A7A7A';
const PETROLEO_BG   = '#E0EBEB';
const OLIVA         = '#5C6B2E';
const CREAM         = '#F7F5F0';
const WHITE         = '#FFFFFF';
const TEXT_DARK     = '#1A1A1A';
const TEXT_MID      = '#6B6B6B';
const BORDER        = '#E0DDD6';
const ERROR_RED     = '#C94A4A';
// ───────────────────────────────────────────────────────────────────────────────

export default function DetalhesSolicitacao() {
  const router = useRouter();
  const { idAgendamento } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [agendamento, setAgendamento] = useState(null);

  useEffect(() => {
    fetchDetalhes();
  }, [idAgendamento]);

  const fetchDetalhes = async () => {
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          usuario:id_cliente (nome_usuario),
          servico:id_servico (nome_servico)
        `)
        .eq('id_agendamento', idAgendamento)
        .single();

      if (error) throw error;
      setAgendamento(data);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar os detalhes.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const responder = async (novoStatus) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: novoStatus })
        .eq('id_agendamento', idAgendamento);

      if (error) throw error;

      const aprovou = novoStatus === 'confirmado';
      const acaoPalavra = aprovou ? 'ACEITOU' : 'RECUSOU';
      const tituloAlerta = aprovou ? "Sucesso!" : "Solicitação Negada";
      
      const msg = `Você ${acaoPalavra} o atendimento de ${agendamento?.usuario?.nome_usuario || 'Cliente'}.`;

      Alert.alert(
        tituloAlerta, 
        msg,
        [{ 
          text: "OK", 
          onPress: () => {
            router.replace('/profissional/notificacoes'); 
          } 
        }]
      );

    } catch (error) {
      Alert.alert("Erro", "Falha ao atualizar status.");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PETROLEO} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Estilizado */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close-outline" size={32} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitação de Atendimento</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Bloco de Informações Principais */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.labelField}>Paciente</Text>
            <Text style={styles.valueField}>{agendamento?.usuario?.nome_usuario}</Text>
          </View>
          
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.labelField}>Procedimento</Text>
            <Text style={[styles.valueField, { color: PETROLEO_VIVO, fontWeight: '700' }]}>
              {agendamento?.servico?.nome_servico}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.labelField}>Data e Horário</Text>
            <Text style={styles.valueField}>{agendamento?.hora_agendamento}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.labelField}>Endereço de Atendimento</Text>
            <Text style={styles.valueField}>{agendamento?.endereco}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.labelField}>Metodo de Pagamento</Text>
            <Text style={styles.badgePagamento}>{agendamento?.metodo_pagamento}</Text>
          </View>
        </View>

        {/* Bloco de Observações/Descrição */}
        <View style={styles.descSection}>
          <Text style={styles.sectionTitle}>Observações do Paciente</Text>
          <View style={styles.whiteCard}>
            <Text style={styles.descText}>
              {agendamento?.observacao || "Nenhuma observação ou especificação informada pelo paciente."}
            </Text>
          </View>
        </View>

        {/* Ações Inferiores */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            activeOpacity={0.85}
            style={[styles.btnAcao, styles.btnAceitar]} 
            onPress={() => responder('confirmado')}
          >
            <Text style={styles.btnTextAceitar}>Aceitar Atendimento</Text>
            <Ionicons name="checkmark-circle-outline" size={20} color={WHITE} />
          </TouchableOpacity>

          <TouchableOpacity 
            activeOpacity={0.85}
            style={[styles.btnAcao, styles.btnRecusar]} 
            onPress={() => responder('cancelado')}
          >
            <Text style={styles.btnTextRecusar}>Recusar Solicitação</Text>
          </TouchableOpacity>
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
  header: { 
    paddingTop: 16, 
    backgroundColor: WHITE, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  closeBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: TEXT_DARK,
    letterSpacing: -0.3
  },
  content: { 
    padding: 20 
  },
  
  // Cartão de Informações Gerais
  infoCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  infoRow: {
    marginVertical: 4,
  },
  labelField: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: TEXT_MID,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  valueField: {
    fontSize: 16,
    color: TEXT_DARK,
    fontWeight: '500',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    my: 12,
    marginVertical: 12,
  },
  badgePagamento: {
    fontSize: 13,
    fontWeight: '600',
    color: OLIVA,
    backgroundColor: '#ECF0DC', // OLIVA_BG
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 2,
  },

  // Seção de Descrição
  descSection: { 
    marginBottom: 32 
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: TEXT_DARK, 
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  whiteCard: { 
    backgroundColor: WHITE, 
    padding: 20, 
    borderRadius: 14, 
    minHeight: 110, 
    borderWidth: 1, 
    borderColor: BORDER,
  },
  descText: { 
    fontSize: 15, 
    color: TEXT_DARK, 
    lineHeight: 22,
    fontStyle: 'italic'
  },

  // Container de Ações e Botões
  actionContainer: {
    gap: 14,
    marginBottom: 20,
  },
  btnAcao: { 
    width: '100%', 
    paddingVertical: 16, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnAceitar: {
    backgroundColor: PETROLEO,
    shadowColor: PETROLEO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  btnRecusar: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: ERROR_RED,
  },
  btnTextAceitar: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: WHITE,
    letterSpacing: 0.5
  },
  btnTextRecusar: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: ERROR_RED,
    letterSpacing: 0.5
  }
});