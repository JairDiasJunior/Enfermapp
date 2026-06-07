//perfil 
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { supabase } from '../../services/api';
import { decode } from 'base64-arraybuffer'; 

// Paleta de cores refinada combinando com o Dashboard
const CREAM = '#FDFBF7';        
const VERDE_VIVO = '#2E6F40';   
const PETROLEO = '#0F262E';     
const TEXT_MID = '#768A7E';     
const BORDER = '#E3E8E5';       
const WHITE = '#FFFFFF';
const RED = '#C94A4A';

export default function Perfil() {
  const router = useRouter();
  const [foto, setFoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [dadosUsuario, setDadosUsuario] = useState({
    nome_usuario: '',
    cidade: '',
    telefone: '',
    pagamento_usado: '',
    servicos_recebidos: 0,
    advertencias: 0 
  });

  const buscarDados = async () => {
    try {
      setFetching(true);
      const nomeSalvo = await AsyncStorage.getItem('nome_logado');
      if (!nomeSalvo) {
        router.replace('/login');
        return;
      }

      const { data, error } = await supabase
        .from('usuario')
        .select('nome_usuario, cidade, telefone, pagamento_usado, foto_perfil, servicos_recebidos, advertencias')
        .eq('nome_usuario', nomeSalvo) 
        .single();

      if (error) throw error;

      if (data) {
        setDadosUsuario({
          nome_usuario: data.nome_usuario,
          cidade: data.cidade || 'Não informada',
          telefone: data.telefone || 'Não informado',
          pagamento_usado: data.pagamento_usado || 'Não informado',
          servicos_recebidos: data.servicos_recebidos || 0,
          advertencias: data.advertencias || 0 
        });
        setFoto(data.foto_perfil);
      }
    } catch (error) {
      console.log("Erro ao buscar dados:", error.message);
    } finally {
      setFetching(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      buscarDados();
    }, [])
  );

  const escolherFoto = async () => {
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
      const fileName = `${Date.now()}-${nomeSalvo}.png`;

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
            <Text style={styles.name}>{dadosUsuario.nome_usuario}</Text>
            <Text style={styles.avisoText}>Cliente Particular</Text>
          </View>
        </View>

        {/* CARD PRINCIPAL DE DETALHES */}
        <View style={styles.cardDetails}>
          <Text style={styles.sectionTitle}>Dados do Cliente</Text>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="location" size={18} color={VERDE_VIVO} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.infoLabel}>Cidade</Text>
              <Text style={styles.infoValue}>{dadosUsuario.cidade}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="call" size={18} color={VERDE_VIVO} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.infoLabel}>Telefone</Text>
              <Text style={styles.infoValue}>{dadosUsuario.telefone}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="briefcase" size={18} color={VERDE_VIVO} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.infoLabel}>Serviços Recebidos</Text>
              <Text style={styles.infoValue}>{dadosUsuario.servicos_recebidos}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconContainer, dadosUsuario.advertencias > 0 && { backgroundColor: '#FDF2F2' }]}>
              <Ionicons 
                name="alert-circle" 
                size={18} 
                color={dadosUsuario.advertencias > 0 ? RED : TEXT_MID} 
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.infoLabel}>Advertências</Text>
              <Text style={[
                styles.infoValue, 
                dadosUsuario.advertencias > 0 && { color: RED, fontWeight: '700' }
              ]}>
                {dadosUsuario.advertencias}
              </Text>
            </View>
          </View>

          {/* SUBSECÇÃO DE PAGAMENTO */}
          <View style={styles.paymentSection}>
            <Text style={styles.subTitle}>Forma de Pagamento Preferencial</Text>
            <View style={styles.badgePagamento}>
              <Ionicons name="card" size={16} color={PETROLEO} />
              <Text style={styles.infoValueBold}>{dadosUsuario.pagamento_usado.toUpperCase()}</Text>
            </View>
          </View>
        </View> 

        {/* BOTÃO EDITAR */}
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/cliente/editar_dados')}
        >
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
    color: TEXT_MID,
    marginTop: 2,
    fontWeight: '500'
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
  paymentSection: { 
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
    fontSize: 14, 
    color: PETROLEO 
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