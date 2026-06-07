//CriarIntercorrencia.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../services/api';

// Paleta de cores premium unificada para o app
const CREAM = '#FDFBF7';        
const VERDE_VIVO = '#2E6F40';   
const PETROLEO = '#0F262E';     
const TEXT_MID = '#768A7E';     
const BORDER = '#E3E8E5';       
const WHITE = '#FFFFFF';

export default function CriarIntercorrencia() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Dados que vêm da tela anterior
  const { id_agendamento, aberto_por, contra_quem, nome_servico, tipo_usuario } = params;

  const [motivo, setMotivo] = useState(''); 
  const [descricao, setDescricao] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleEnviar = async () => {
    if (!motivo || !descricao) {
      Alert.alert("Aviso", "Por favor, preencha o motivo e o detalhamento.");
      return;
    }

    setLoading(true);
    try {
      let publicUrl = null;

      // 1. Upload da Imagem (se houver)
      if (image) {
        const response = await fetch(image);
        const arrayBuffer = await response.arrayBuffer();
        const fileName = `disputa_${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('intercorrencias')
          .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('intercorrencias').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      // 2. Insert na tabela intercorrencia
      const { error } = await supabase
        .from('intercorrencia')
        .insert([{
          id_agendamento: Number(id_agendamento),
          aberta_por: tipo_usuario, 
          motivo_categoria: motivo,
          descricao: descricao,
          imagem_url: publicUrl,
          status: 'pendente'
        }]);

      if (error) {
        console.error("Erro no Supabase:", error);
        throw error;
      }

      Alert.alert("Sucesso", "Sua intercorrência foi enviada ao administrador.");
      router.back();
    } catch (error) {
      console.error("Detalhes do erro:", error);
      Alert.alert("Erro", "Não foi possível salvar a intercorrência. Verifique se o ID do agendamento é válido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* BOTÃO VOLTAR NO TOPO */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={PETROLEO} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Abrir Intercorrência</Text>
        <Text style={styles.subtitle}>Atendimento #{id_agendamento}</Text>

        {/* METADADOS DO AGENDAMENTO COM INPUT DE CATEGORIA INTEGRADO */}
        <View style={styles.cardInfo}>
          <View style={styles.infoLine}>
            <Text style={styles.label}>Relatante</Text>
            <Text style={styles.value}>{aberto_por}</Text>
          </View>
          
          <View style={styles.infoLine}>
            <Text style={styles.label}>Envolvido</Text>
            <Text style={styles.value}>{contra_quem}</Text>
          </View>

          <View style={styles.infoLine}>
            <Text style={styles.label}>Serviço prestado</Text>
            <Text style={styles.value}>{nome_servico}</Text>
          </View>

          <View style={[styles.infoLine, { borderBottomWidth: 0, paddingBottom: 0, flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
            <Text style={styles.label}>Qual o motivo principal?</Text>
            <TextInput 
              style={styles.motivoInput}
              placeholder="Ex: Atraso, Valor incorreto, Não compareceu..."
              placeholderTextColor="#A4B4AB"
              value={motivo}
              onChangeText={setMotivo}
            />
          </View>
        </View>

        {/* SEÇÃO DE EVIDÊNCIA EM IMAGEM */}
        <Text style={styles.sectionTitle}>Anexar Imagem / Prova</Text>
        <View style={styles.imageCardContainer}>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.9}>
            {image ? (
              <Image source={{ uri: image }} style={styles.preview} />
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="image-outline" size={44} color={TEXT_MID} />
                <Text style={styles.placeholderText}>Nenhuma imagem selecionada</Text>
              </View>
            )}
            <View style={styles.attachBtn}>
              <Ionicons name="camera-outline" size={16} color={WHITE} />
              <Text style={styles.attachBtnText}>{image ? "Substituir Foto" : "Selecionar da Galeria"}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* DETALHAMENTO TEXTUAL */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Detalhar Acontecimento</Text>
          <Text style={styles.charCountText}>(Máx. 200 caracteres)</Text>
        </View>

        <TextInput 
          style={styles.textArea}
          multiline
          placeholder="Descreva o ocorrido de forma clara e objetiva para análise da moderação..."
          placeholderTextColor="#A4B4AB"
          maxLength={200}
          value={descricao}
          onChangeText={setDescricao}
        />

        {/* BOTÃO DE SUBMISSÃO DA DISPUTA */}
        <TouchableOpacity 
          style={[styles.submitBtn, { opacity: loading ? 0.7 : 1 }]} 
          onPress={handleEnviar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={WHITE} />
          ) : (
            <Text style={styles.submitBtnText}>Protocolar Disputa</Text>
          )}
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
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_MID,
    fontWeight: '600',
    marginBottom: 24,
    marginTop: 2
  },
  cardInfo: { 
    backgroundColor: WHITE, 
    padding: 18, 
    borderRadius: 16, 
    marginBottom: 24, 
    borderWidth: 1.5,
    borderColor: BORDER,
    shadowColor: PETROLEO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: CREAM
  },
  label: { 
    fontSize: 13, 
    color: TEXT_MID, 
    fontWeight: '500' 
  },
  value: { 
    fontWeight: '700', 
    color: PETROLEO, 
    fontSize: 14 
  },
  motivoInput: { 
    fontSize: 14, 
    width: '100%',
    paddingVertical: 10, 
    paddingHorizontal: 12,
    color: PETROLEO,
    backgroundColor: CREAM,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    fontWeight: '500'
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: PETROLEO, 
    marginBottom: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase'
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2
  },
  charCountText: {
    fontSize: 11,
    color: TEXT_MID,
    fontWeight: '500',
    marginBottom: 10
  },
  imageCardContainer: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: 24,
    padding: 8
  },
  imagePicker: { 
    backgroundColor: CREAM, 
    height: 200, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative'
  },
  placeholderContainer: {
    alignItems: 'center',
    paddingBottom: 24
  },
  placeholderText: { 
    color: TEXT_MID, 
    marginTop: 8,
    fontSize: 13,
    fontWeight: '500'
  },
  preview: { 
    width: '100%', 
    height: '100%',
    resizeMode: 'cover'
  },
  attachBtn: { 
    flexDirection: 'row',
    backgroundColor: PETROLEO, 
    width: '100%', 
    paddingVertical: 12, 
    position: 'absolute', 
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  attachBtnText: { 
    color: WHITE, 
    fontSize: 13, 
    fontWeight: '600' 
  },
  textArea: { 
    backgroundColor: WHITE, 
    height: 140, 
    borderRadius: 14, 
    padding: 14, 
    fontSize: 15, 
    textAlignVertical: 'top', 
    marginBottom: 28, 
    color: PETROLEO, 
    borderWidth: 1.5,
    borderColor: BORDER,
    fontWeight: '500'
  },
  submitBtn: { 
    backgroundColor: VERDE_VIVO, 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    shadowColor: VERDE_VIVO, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: WHITE,
    letterSpacing: 0.3
  }
});