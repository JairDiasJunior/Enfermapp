import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { supabase } from '../../services/api';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

// Mesma paleta de cores refinada do Perfil do Cliente
const CREAM = '#FDFBF7';        
const VERDE_VIVO = '#2E6F40';   
const PETROLEO = '#0F262E';     
const TEXT_MID = '#768A7E';     
const BORDER = '#E3E8E5';       
const WHITE = '#FFFFFF';
const RED = '#C94A4A';

export default function PerfilProfissional() {
  const router = useRouter();
  const [foto, setFoto] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false); 
  
  const [dados, setDados] = useState({
    nome_usuario: '',
    cidade: '',
    telefone: '',
    pagamento_usado: 'Não informado',
    descricao: '',
    media_avaliacao: 0,
    total_avaliacoes: 0,
    horario: '',
    advertencias: 0 
  });

  const buscarDados = async () => {
    try {
      setFetching(true);
      const nomeSalvo = await AsyncStorage.getItem('nome_logado');
      if (!nomeSalvo) { router.replace('/login'); return; }

      // 1. Busca os dados principais do profissional e da tabela usuario relacionando pagamento_usado
      const { data: prof, error: profError } = await supabase
        .from('profissional')
        .select(`
          id_profissional, 
          descricao, 
          media_avaliacao, 
          total_avaliacoes,
          usuario!inner (id_usuario, nome_usuario, cidade, telefone, foto_perfil, advertencias, pagamento_usado)
        `)
        .eq('usuario.nome_usuario', nomeSalvo)
        .maybeSingle();

      if (profError) throw profError;

      if (prof) {
        const idP = prof.id_profissional;

        // 2. Busca apenas a tabela de horários (já que pagamento está na tabela usuario)
        const { data: resH, error: hError } = await supabase
          .from('horarios_profissional')
          .select('*')
          .eq('id_profissional', idP)
          .maybeSingle();

        // 3. Monta o estado com os dados corretos mapeados do BD
        setDados({
          nome_usuario: prof.usuario?.nome_usuario || 'Não informado',
          cidade: prof.usuario?.cidade || 'Não informada',
          telefone: prof.usuario?.telefone || 'Não informado',
          pagamento_usado: prof.usuario?.pagamento_usado || 'Não informado',
          descricao: prof.descricao || 'Nenhuma descrição informada.',
          media_avaliacao: prof.media_avaliacao || 0,
          total_avaliacoes: prof.total_avaliacoes || 0,
          advertencias: prof.usuario?.advertencias || 0, 
          horario: resH?.tipo_horario === 'flexivel' 
            ? 'Atendimento 24h (Sem hora fixa)' 
            : (resH?.horario_inicio ? `${resH.horario_inicio.slice(0,5)} - ${resH.var_fim ? resH.horario_fim.slice(0,5) : resH.horario_fim?.slice(0,5)}` : 'Horário não definido'),
        });
        
        if (prof.usuario?.foto_perfil) setFoto(prof.usuario.foto_perfil);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil profissional:", error.message);
    } finally {
      setFetching(false);
    }
  };

  const escolherFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permissão", "Precisamos de acesso às suas fotos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      uploadImagem(result.assets[0].base64);
    }
  };

  const uploadImagem = async (base64) => {
    try {
      setLoading(true);
      const nomeSalvo = await AsyncStorage.getItem('nome_logado');
      const fileName = `${nomeSalvo}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, decode(base64), { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('usuario')
        .update({ foto_perfil: publicUrl })
        .eq('nome_usuario', nomeSalvo);

      if (updateError) throw updateError;

      setFoto(publicUrl);
      Alert.alert("Sucesso", "Foto de perfil updated!");
    } catch (error) {
      Alert.alert("Erro", error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { buscarDados(); }, []));

  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={VERDE_VIVO} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* BOTÃO VOLTAR */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={PETROLEO} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>

        {/* HEADER DO PERFIL */}
        <View style={styles.headerCard}>
          <TouchableOpacity 
            style={[styles.avatarCircle, foto ? styles.avatarCircleFilled : null]} 
            onPress={escolherFoto} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={WHITE} />
            ) : foto ? (
              <Image source={{ uri: foto }} style={styles.fotoAvatar} />
            ) : (
              <Ionicons name="person" size={32} color={WHITE} />
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={12} color={WHITE} />
            </View>
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.name}>{dados.nome_usuario}</Text>
            <Text style={styles.avisoText}>
              ⭐ {Number(dados.media_avaliacao).toFixed(1)} ({dados.total_avaliacoes} avaliações)
            </Text>
          </View>
        </View>

        {/* CARD PRINCIPAL DE DETALHES */}
        <View style={styles.cardDetails}>
          <Text style={styles.sectionTitle}>Dados do Profissional</Text>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="location" size={18} color={VERDE_VIVO} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.infoLabel}>Cidade</Text>
              <Text style={styles.infoValue}>{dados.cidade}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="call" size={18} color={VERDE_VIVO} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.infoLabel}>WhatsApp</Text>
              <Text style={styles.infoValue}>{dados.telefone}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="time" size={18} color={VERDE_VIVO} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.infoLabel}>Horário de Atendimento</Text>
              <Text style={styles.infoValue}>{dados.horario}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconContainer, dados.advertencias > 0 && { backgroundColor: '#FDF2F2' }]}>
              <Ionicons 
                name="alert-circle" 
                size={18} 
                color={dados.advertencias > 0 ? RED : TEXT_MID} 
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.infoLabel}>Advertências</Text>
              <Text style={[
                styles.infoValue, 
                dados.advertencias > 0 && { color: RED, fontWeight: '700' }
              ]}>
                {dados.advertencias}
              </Text>
            </View>
          </View>

          {/* SUBSECÇÃO DE PAGAMENTO */}
          <View style={styles.subSection}>
            <Text style={styles.subTitle}>Forma de Recebimento Principal</Text>
            <View style={styles.badgePagamento}>
              <Ionicons name="card" size={16} color={PETROLEO} />
              <Text style={styles.infoValueBold}>
                {dados.pagamento_usado.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* SUBSECÇÃO DE DESCRIÇÃO */}
          <View style={styles.subSection}>
            <Text style={styles.subTitle}>Descrição Profissional</Text>
            <View style={styles.descricaoBox}>
              <Text style={styles.descricaoText}>{dados.descricao}</Text>
            </View>
          </View>

        </View> 

        {/* BOTÃO EDITAR */}
        <TouchableOpacity style={styles.button} onPress={() => router.push('/profissional/editar_dados')}>
          <Ionicons name="create-outline" size={18} color={WHITE} style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Editar meus dados</Text>
        </TouchableOpacity>

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
    backgroundColor: CREAM, 
    justifyContent: 'center', 
    alignItems: 'center' 
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
    fontSize: 15,
    fontWeight: '500',
  },
  headerCard: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarCircle: { 
    width: 74, 
    height: 74, 
    borderRadius: 37, 
    backgroundColor: PETROLEO, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1.5, 
    borderColor: BORDER, 
    position: 'relative'
  },
  avatarCircleFilled: {
    borderColor: VERDE_VIVO,
    borderWidth: 2,
  },
  fotoAvatar: { 
    width: '100%', 
    height: '100%',
    borderRadius: 37 
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: VERDE_VIVO,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: CREAM
  },
  userInfo: { 
    marginLeft: 16,
    flex: 1
  },
  name: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: PETROLEO,
    letterSpacing: -0.5
  },
  avisoText: { 
    fontSize: 13, 
    color: VERDE_VIVO,
    marginTop: 2,
    fontWeight: '700'
  },
  cardDetails: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: BORDER,
    shadowColor: PETROLEO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: PETROLEO, 
    marginBottom: 20,
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: CREAM,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
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
    fontSize: 15,
    color: PETROLEO,
    fontWeight: '500',
    marginTop: 1
  },
  subSection: { 
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER
  },
  subTitle: { 
    fontSize: 11, 
    fontWeight: '600', 
    marginBottom: 8, 
    color: TEXT_MID,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  badgePagamento: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CREAM,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6
  },
  infoValueBold: { 
    fontWeight: '700', 
    fontSize: 13, 
    color: PETROLEO 
  },
  descricaoBox: {
    backgroundColor: CREAM,
    padding: 12,
    borderRadius: 8,
    marginTop: 2
  },
  descricaoText: { 
    fontSize: 14, 
    color: PETROLEO, 
    fontStyle: 'italic', 
    lineHeight: 20 
  },
  button: { 
    backgroundColor: VERDE_VIVO, 
    paddingVertical: 14, 
    borderRadius: 12, 
    marginTop: 24, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: VERDE_VIVO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: { 
    fontSize: 16, 
    color: WHITE, 
    fontWeight: '600',
    letterSpacing: 0.3
  },
});