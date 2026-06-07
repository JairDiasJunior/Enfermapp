//notificacoes_cliente
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
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

export default function NotificacoesCliente() {
  const router = useRouter();
  const [notificacoes, setNotificacoes] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Estado para controlar qual ID de intercorrência está com o mouse em cima (Hover)
  const [hoveredId, setHoveredId] = useState(null);

  const buscarDados = async () => {
    try {
      setLoading(true);
      const nomeLogado = await AsyncStorage.getItem('nome_logado');

      // 1. Pegar o Perfil do cliente logado
      const { data: user } = await supabase
        .from('usuario')
        .select('id_usuario, nome_usuario, advertencias')
        .eq('nome_usuario', nomeLogado)
        .single();

      if (user) {
        setPerfil(user);

        // 2. Buscar agendamentos normais
        const { data: agendamentos } = await supabase
          .from('agendamentos')
          .select(`
            id_agendamento, status, hora_agendamento,
            profissional:id_profissional ( usuario:id_usuario (nome_usuario) ),
            servico:id_servico (nome_servico)
          `)
          .eq('id_cliente', user.id_usuario);

        // 3. Buscar Intercorrências (Disputas)
        const { data: disputas } = await supabase
          .from('intercorrencia')
          .select(`
            *,
            agendamentos!inner ( 
                id_cliente,
                servico:id_servico (nome_servico) 
            )
          `)
          .eq('agendamentos.id_cliente', user.id_usuario);

        // 4. Formatar e Unificar as notificações
        const listaNotificacoes = [
          ...(agendamentos || []).map(a => ({ ...a, tipo: 'agendamento' })),
          ...(disputas || []).map(d => ({ ...d, tipo: 'disputa' }))
        ];

        // Ordenar por ID mais recente primeiro
        listaNotificacoes.sort((a, b) => (b.id_agendamento || b.id_intercorrencia) - (a.id_agendamento || a.id_intercorrencia));
        
        setNotificacoes(listaNotificacoes);
      }
    } catch (error) {
      console.error("Erro ao carregar notificações:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      buscarDados();
    }, [])
  );

  const renderItem = ({ item }) => {
    // --- CASO DISPUTA (INTERCORRÊNCIA) ---
    if (item.tipo === 'disputa') {
      const contraMim = item.aberta_por === 'profissional';
      const resolvida = item.status === 'resolvido';
      
      // Verifica se este item específico está sofrendo Hover do mouse
      const isHovered = hoveredId === item.id_intercorrencia;

      return (
        <TouchableOpacity 
          style={[
            styles.cardBase, 
            styles.cardClicavel, 
            resolvida && styles.cardResolvido,
            isHovered && styles.cardHoverEffect // Aplica o estilo de hover dinamicamente
          ]}
          onPress={() => router.push({ pathname: '/cliente/detalhes_intercorrencia_view', params: { id: item.id_agendamento } })}
          activeOpacity={0.7}
          // Eventos de mouse compatíveis com Web/Emuladores
          onMouseEnter={() => setHoveredId(item.id_intercorrencia)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <View style={[styles.iconWrapper, { backgroundColor: resolvida ? '#EBF7EE' : '#FDF2F2' }]}>
            <Ionicons name={resolvida ? "checkmark-done" : "alert-circle-outline"} size={20} color={resolvida ? VERDE_VIVO : RED} />
          </View>
          
          <View style={styles.cardTextContent}>
            <View style={styles.badgeRow}>
              <Text style={[styles.cardTitle, { color: resolvida ? VERDE_VIVO : RED }]}>
                {resolvida ? "Disputa Encerrada" : (contraMim ? "Disputa Contra Você" : "Sua Disputa em Análise")}
              </Text>
              <View style={[styles.tagBadge, { backgroundColor: resolvida ? '#EBF7EE' : '#FDF2F2' }]}>
                <Text style={[styles.tagBadgeText, { color: resolvida ? VERDE_VIVO : RED }]}>Ver Caso</Text>
              </View>
            </View>
            <Text style={styles.cardSub} numberOfLines={2}>
              {resolvida 
                ? `Decisão: ${item.veredito || 'Caso encerrado pela moderação.'}` 
                : `Sobre o procedimento de ${item.agendamentos?.servico?.nome_servico}.`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={PETROLEO} style={styles.chevronIcon} />
        </TouchableOpacity>
      );
    }

    // --- CASOS DE AGENDAMENTO ---
    if (item.status === 'pendente') {
      return (
        <View style={styles.cardBase}>
          <View style={[styles.iconWrapper, { backgroundColor: '#FFFDE7' }]}>
            <Ionicons name="time-outline" size={20} color={GOLD} />
          </View>
          <View style={styles.cardTextContent}>
            <Text style={[styles.cardTitle, { color: GOLD }]}>Solicitação em Análise</Text>
            <Text style={styles.cardSub}>
              Seu agendamento para <Text style={styles.bold}>{item.servico?.nome_servico}</Text> aguarda confirmação do profissional.
            </Text>
          </View>
        </View>
      );
    }

    if (item.status === 'confirmado') {
      return (
        <View style={styles.cardBase}>
          <View style={[styles.iconWrapper, { backgroundColor: '#EBF7EE' }]}>
            <Ionicons name="calendar-outline" size={20} color={VERDE_VIVO} />
          </View>
          <View style={styles.cardTextContent}>
            <Text style={[styles.cardTitle, { color: VERDE_VIVO }]}>Atendimento Confirmado!</Text>
            <Text style={styles.cardSub}>
              O profissional <Text style={styles.bold}>{item.profissional?.usuario?.nome_usuario}</Text> aceitou sua solicitação.
            </Text>
          </View>
        </View>
      );
    }

    if (item.status === 'cancelado') {
      return (
        <View style={styles.cardBase}>
          <View style={[styles.iconWrapper, { backgroundColor: '#FDF2F2' }]}>
            <Ionicons name="close-circle-outline" size={20} color={RED} />
          </View>
          <View style={styles.cardTextContent}>
            <Text style={[styles.cardTitle, { color: PETROLEO }]}>Solicitação Recusada</Text>
            <Text style={styles.cardSub}>
              O profissional recusou ou cancelou o agendamento de <Text style={styles.bold}>{item.servico?.nome_servico}</Text>.
            </Text>
          </View>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={PETROLEO} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minhas Notificações</Text>
      </View>

      {/* BANNER DE ADVERTÊNCIA */}
      {perfil?.advertencias > 0 && (
        <View style={[styles.bannerAviso, perfil.advertencias >= 3 ? styles.bannerSuspenso : null]}>
          <Ionicons name="warning-outline" size={20} color={WHITE} />
          <Text style={styles.bannerText}>
            {perfil.advertencias >= 3 
              ? "Sua conta foi suspensa temporariamente por excesso de avisos da moderação." 
              : `Atenção: Você possui ${perfil.advertencias} aviso(s) formal(ais). Evite quebras de termos para não perder o acesso.`}
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
          ListEmptyComponent={
            <View style={styles.vazioContainer}>
              <Ionicons name="mail-open-outline" size={44} color={TEXT_MID} />
              <Text style={styles.vazio}>Tudo limpo por aqui! Você não tem novas notificações.</Text>
            </View>
          }
        />
      )}
    </View>
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
  cardClicavel: {
    borderColor: BORDER,
    shadowOpacity: 0.05,
    elevation: 3,
  },
  // ESTILO DO EFEITO HOVER (PASSAR O MOUSE)
  cardHoverEffect: {
    backgroundColor: '#F5F7F6', // Escurece levemente o fundo branco original
    borderColor: TEXT_MID,      // Deixa a borda com mais destaque usando a cor média
    transform: [{ scale: 1.01 }] // Dá um micro-zoom elegante (disponível em ambientes com suporte a animação/web)
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingRight: 4
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
  cardResolvido: { 
    backgroundColor: WHITE
  },
  chevronIcon: {
    marginLeft: 4,
    opacity: 0.8
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