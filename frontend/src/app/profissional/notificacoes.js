import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/api';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Paleta de cores premium unificada para o app
const CREAM = '#FDFBF7';        
const VERDE_VIVO = '#2E6F40';   
const PETROLEO = '#0F262E';     
const TEXT_MID = '#768A7E';     
const BORDER = '#E3E8E5';       
const WHITE = '#FFFFFF';
const RED = '#C94A4A';
const GOLD = '#E6A119';

export default function NotificacoesProfissional() {
  const router = useRouter();
  const [notificacoes, setNotificacoes] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const buscarDados = async () => {
    try {
      if (!refreshing) setLoading(true);
      const nomeLogado = await AsyncStorage.getItem('nome_logado');

      // 1. Pegar ID e dados de advertência do profissional
      const { data: prof } = await supabase
        .from('profissional')
        .select('id_profissional, advertencias, usuario!inner(id_usuario, nome_usuario)')
        .eq('usuario.nome_usuario', nomeLogado)
        .single();

      if (prof) {
        setPerfil(prof);

        // 2. Buscar agendamentos
        const { data: agendamentos } = await supabase
          .from('agendamentos')
          .select(`
            id_agendamento, status, hora_agendamento,
            usuario:id_cliente (nome_usuario),
            servico:id_servico (nome_servico)
          `)
          .eq('id_profissional', prof.id_profissional);

        // 3. Buscar Intercorrências (Disputas)
        const { data: disputas } = await supabase
          .from('intercorrencia')
          .select(`
            *,
            agendamentos!inner ( 
                id_profissional,
                servico:id_servico (nome_servico) 
            )
          `)
          .eq('agendamentos.id_profissional', prof.id_profissional);

        // 4. Buscar Avaliações Novas
        const { data: avaliacoes } = await supabase
          .from('avaliacoes')
          .select('*')
          .eq('id_profissional', prof.id_profissional);

        // 5. Unificar Tudo
        const listaNotificacoes = [
          ...(agendamentos || []).map(a => ({ ...a, tipo: 'agendamento' })),
          ...(disputas || []).map(d => ({ ...d, tipo: 'disputa' })),
          ...(avaliacoes || []).map(av => ({ ...av, tipo: 'avaliacao' }))
        ];

        // Ordenar por ID decrescente
        listaNotificacoes.sort((a, b) => (b.id_agendamento || b.id_intercorrencia || b.id) - (a.id_agendamento || a.id_intercorrencia || a.id));
        
        setNotificacoes(listaNotificacoes);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do profissional:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      buscarDados();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    buscarDados();
  };

  const renderItem = ({ item }) => {
    // --- NOTIFICAÇÃO DE DISPUTA ---
    if (item.tipo === 'disputa') {
      const contraMim = item.aberta_por === 'cliente';
      const resolvida = item.status === 'resolvido';

      return (
        <TouchableOpacity 
          style={styles.cardBase}
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/profissional/detalhes_intercorrencia_view', params: { id: item.id_intercorrencia } })}
        >
          <View style={[styles.iconWrapper, { backgroundColor: resolvida ? '#EBF7EE' : '#FDF2F2' }]}>
            <Ionicons name={resolvida ? "checkmark-done" : "alert-circle-outline"} size={20} color={resolvida ? VERDE_VIVO : RED} />
          </View>
          
          <View style={styles.cardTextContent}>
            <View style={styles.badgeRow}>
              <Text style={[styles.cardTitle, { color: resolvida ? VERDE_VIVO : RED }]}>
                {resolvida ? "Disputa Encerrada" : (contraMim ? "Nova Reclamação" : "Sua Disputa em Análise")}
              </Text>
              <View style={[styles.tagBadge, { backgroundColor: resolvida ? '#EBF7EE' : '#FDF2F2' }]}>
                <Text style={[styles.tagBadgeText, { color: resolvida ? VERDE_VIVO : RED }]}>Caso</Text>
              </View>
            </View>
            <Text style={styles.cardSub} numberOfLines={2}>
              {resolvida ? `Veredito: ${item.veredito}` : `Sobre o serviço de ${item.agendamentos?.servico?.nome_servico}.`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={TEXT_MID} />
        </TouchableOpacity>
      );
    }

    // --- NOTIFICAÇÃO DE AVALIAÇÃO ---
    if (item.tipo === 'avaliacao') {
      return (
        <View style={styles.cardBase}>
          <View style={[styles.iconWrapper, { backgroundColor: '#FFFDE7' }]}>
            <Ionicons name="star" size={18} color={GOLD} />
          </View>
          <View style={styles.cardTextContent}>
            <Text style={[styles.cardTitle, { color: PETROLEO }]}>Nova Avaliação Recebida!</Text>
            <Text style={styles.cardSub}>Um cliente deixou uma nota e comentário sobre o seu último atendimento.</Text>
          </View>
        </View>
      );
    }

    // --- NOTIFICAÇÃO DE AGENDAMENTO (PENDENTE) ---
    if (item.status === 'pendente') {
      return (
        <TouchableOpacity 
          style={styles.cardBase}
          activeOpacity={0.7}
          onPress={() => router.push({
            pathname: '/profissional/detalhes_solicitacao',
            params: { idAgendamento: item.id_agendamento }
          })}
        >
          <View style={[styles.iconWrapper, { backgroundColor: '#EBF7EE' }]}>
            <Ionicons name="mail-outline" size={20} color={VERDE_VIVO} />
          </View>
          <View style={styles.cardTextContent}>
            <View style={styles.badgeRow}>
              <Text style={[styles.cardTitle, { color: VERDE_VIVO }]}>Solicitação de Atendimento</Text>
              <View style={[styles.tagBadge, { backgroundColor: '#EBF7EE' }]}>
                <Text style={[styles.tagBadgeText, { color: VERDE_VIVO }]}>Novo</Text>
              </View>
            </View>
            <Text style={styles.cardSub}>
              Cliente <Text style={styles.bold}>{item.usuario?.nome_usuario}</Text> enviou um pedido. Toque para responder.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={VERDE_VIVO} />
        </TouchableOpacity>
      );
    }

    // --- NOTIFICAÇÃO DE AGENDAMENTO (RECUSADO / CANCELADO) ---
    if (item.status === 'rejeitado' || item.status === 'cancelado') {
        return (
          <View style={styles.cardBase}>
            <View style={[styles.iconWrapper, { backgroundColor: '#FDF2F2' }]}>
              <Ionicons name="close-circle-outline" size={20} color={RED} />
            </View>
            <View style={styles.cardTextContent}>
              <Text style={[styles.cardTitle, { color: PETROLEO }]}>Atendimento Cancelado</Text>
              <Text style={styles.cardSub}>
                A solicitação de {item.usuario?.nome_usuario} para o serviço foi recusada ou cancelada.
              </Text>
            </View>
          </View>
        );
    }

    // --- NOTIFICAÇÃO DE AGENDAMENTO (CONFIRMADO) ---
    return (
      <View style={styles.cardBase}>
        <View style={[styles.iconWrapper, { backgroundColor: '#EBF7EE' }]}>
          <Ionicons name="calendar-outline" size={20} color={VERDE_VIVO} />
        </View>
        <View style={styles.cardTextContent}>
          <Text style={[styles.cardTitle, { color: PETROLEO }]}>Atendimento Confirmado</Text>
          <Text style={styles.cardSub}>
            O procedimento de <Text style={styles.bold}>{item.servico?.nome_servico}</Text> está confirmado na sua agenda.
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={PETROLEO} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Central de Notificações</Text>
      </View>

      {/* BANNER DE AVISO / SUSPENSÃO */}
      {perfil?.advertencias > 0 && (
        <View style={[styles.bannerAviso, perfil.advertencias >= 3 ? styles.bannerSuspenso : null]}>
          <Ionicons name="warning-outline" size={20} color={WHITE} />
          <Text style={styles.bannerText}>
            {perfil.advertencias >= 3 
              ? "Sua conta de profissional encontra-se suspensa pela moderação devido ao limite de infrações." 
              : `Atenção: Você possui ${perfil.advertencias}/3 advertência(s). Certifique-se de seguir os termos para evitar bloqueios.`}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={VERDE_VIVO} />
        </View>
      ) : (
        <FlatList
          data={notificacoes}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[VERDE_VIVO]} tintColor={VERDE_VIVO} />
          }
          ListEmptyComponent={
            <View style={styles.vazioContainer}>
              <Ionicons name="mail-open-outline" size={44} color={TEXT_MID} />
              <Text style={styles.vazio}>Nenhuma atualização ou notificação pendente por aqui.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: CREAM 
  },
  header: { 
    paddingTop: 60, 
    paddingHorizontal: 24, 
    paddingBottom: 16,
    backgroundColor: CREAM,
    borderBottomWidth: 1,
    borderColor: BORDER
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4
  },
  backButtonText: {
    color: PETROLEO,
    fontSize: 15,
    fontWeight: '500'
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: PETROLEO,
    letterSpacing: -0.5
  },
  listContent: { 
    padding: 24 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardBase: { 
    backgroundColor: WHITE, 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 14, 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1.5,
    borderColor: BORDER,
    gap: 12,
    shadowColor: PETROLEO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardTextContent: {
    flex: 1
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingRight: 2
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  bannerAviso: { 
    backgroundColor: GOLD, 
    paddingVertical: 12,
    paddingHorizontal: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginHorizontal: 24,
    marginTop: 16, 
    borderRadius: 12,
    gap: 10
  },
  bannerSuspenso: { 
    backgroundColor: RED 
  },
  bannerText: { 
    color: WHITE, 
    fontWeight: '600', 
    flex: 1, 
    fontSize: 13,
    lineHeight: 18
  },
  cardTitle: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: PETROLEO,
  },
  cardSub: { 
    fontSize: 13, 
    color: TEXT_MID, 
    lineHeight: 18,
    fontWeight: '500'
  },
  bold: { 
    fontWeight: '700',
    color: PETROLEO
  },
  vazioContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    gap: 12,
    paddingHorizontal: 20
  },
  vazio: { 
    textAlign: 'center', 
    fontSize: 15, 
    color: TEXT_MID,
    lineHeight: 22,
    fontWeight: '500'
  }
});