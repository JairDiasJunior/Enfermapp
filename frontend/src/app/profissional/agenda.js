import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { supabase } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Paleta de cores oficial do ecossistema do app
const CREAM = '#FDFBF7';        
const VERDE_VIVO = '#2E6F40';   
const PETROLEO = '#0F262E';     
const TEXT_MID = '#768A7E';     
const BORDER = '#E3E8E5';       
const WHITE = '#FFFFFF';

export default function AgendaProfissional() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState([]);

  const buscarAgenda = async () => {
    try {
      setLoading(true);
      const nomeLogado = await AsyncStorage.getItem('nome_logado');
      
      const { data: userData, error: userError } = await supabase
        .from('usuario')
        .select('id_usuario')
        .eq('nome_usuario', nomeLogado)
        .single();

      if (userError || !userData) throw new Error("Usuário não encontrado.");

      const { data: profData, error: profError } = await supabase
        .from('profissional')
        .select('id_profissional')
        .eq('id_usuario', userData.id_usuario)
        .single();

      if (profError || !profData) throw new Error("Perfil profissional não encontrado.");

      // BUSCA COM LÓGICA DE SUMIR QUANDO OS DOIS FINALIZAREM
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id_agendamento,
          hora_agendamento,
          data_agendamento,
          endereco,
          status,
          finalizado_cliente,
          finalizado_profissional,
          cliente:id_cliente (
            nome_usuario,
            telefone
          ),
          servico:id_servico (nome_servico)
        `)
        .eq('id_profissional', profData.id_profissional)
        .eq('status', 'confirmado') 
        .or('finalizado_cliente.eq.false,finalizado_profissional.eq.false')
        .order('data_agendamento', { ascending: true });

      if (error) throw error;
      setAgendamentos(data || []);

    } catch (error) {
      console.error("Erro Agenda Profissional:", error.message);
      Alert.alert("Erro", "Não foi possível carregar sua agenda.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      buscarAgenda();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* BOTÃO VOLTAR NO TOPO */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={PETROLEO} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Agenda de Trabalho</Text>
        <Text style={styles.subtitle}>Confira seus próximos atendimentos e serviços agendados.</Text>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={VERDE_VIVO} />
          </View>
        ) : agendamentos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={48} color={TEXT_MID} />
            </View>
            <Text style={styles.emptyText}>Você não possui atendimentos confirmados no momento.</Text>
          </View>
        ) : (
          agendamentos.map((item) => (
            <TouchableOpacity 
              key={item.id_agendamento} 
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => {
                router.push({
                  pathname: '/profissional/DetalhesAgendamento',
                  params: { id: item.id_agendamento }
                });
              }}
            >
              {/* TOPO DO CARD */}
              <View style={styles.cardHeader}>
                <View style={styles.timeBadge}>
                  <Ionicons name="time" size={16} color={VERDE_VIVO} />
                  <Text style={styles.horarioText}>{item.hora_agendamento}</Text>
                </View>
                <View style={styles.badgeConfirmado}>
                  <View style={styles.dot} />
                  <Text style={styles.badgeText}>CONFIRMADO</Text>
                </View>
              </View>

              {/* NOME DO SERVIÇO */}
              <Text style={styles.servicoText}>{item.servico?.nome_servico}</Text>
              
              <View style={styles.divider} />

              {/* DETALHES DO AGENDAMENTO */}
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color={TEXT_MID} />
                <Text style={styles.infoText}>
                  Cliente: <Text style={styles.infoValue}>{item.cliente?.nome_usuario}</Text>
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color={TEXT_MID} />
                <Text style={styles.infoText} numberOfLines={1}>
                  Local: <Text style={styles.infoValue}>{item.endereco}</Text>
                </Text>
              </View>

              {/* RODAPÉ DO CARD / BOTÃO DE CLICK */}
              <View style={styles.cardFooter}>
                <Text style={styles.footerActionText}>Acessar painel do atendimento</Text>
                <Ionicons name="chevron-forward" size={14} color={VERDE_VIVO} />
              </View>

            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
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
    marginBottom: 6
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_MID,
    marginBottom: 28,
    lineHeight: 20
  },
  centerLoading: {
    marginTop: 60,
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: { 
    backgroundColor: WHITE, 
    borderRadius: 16, 
    padding: 18, 
    marginBottom: 16, 
    borderWidth: 1.5,
    borderColor: BORDER,
    shadowColor: PETROLEO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center', 
    marginBottom: 14 
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CREAM,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: BORDER
  },
  horarioText: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: PETROLEO
  },
  badgeConfirmado: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF7EE', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 20,
    gap: 6
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: VERDE_VIVO
  },
  badgeText: { 
    color: VERDE_VIVO, 
    fontSize: 10, 
    fontWeight: '700',
    letterSpacing: 0.5
  },
  servicoText: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: PETROLEO, 
    marginBottom: 12 
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginBottom: 14
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 6 
  },
  infoText: { 
    fontSize: 13, 
    color: TEXT_MID, 
    marginLeft: 8,
    flex: 1
  },
  infoValue: {
    color: PETROLEO,
    fontWeight: '500'
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 14,
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F7FAF8'
  },
  footerActionText: {
    fontSize: 12,
    color: VERDE_VIVO,
    fontWeight: '600'
  },
  emptyContainer: { 
    alignItems: 'center', 
    marginTop: 60,
    paddingHorizontal: 20
  },
  emptyIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BORDER,
    marginBottom: 16
  },
  emptyText: { 
    color: TEXT_MID, 
    textAlign: 'center', 
    fontSize: 14, 
    lineHeight: 22
  }
});