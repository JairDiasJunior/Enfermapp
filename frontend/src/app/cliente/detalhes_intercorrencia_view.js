//DetalhesIntercorrencia_cliente
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../services/api';

// Paleta de cores premium unificada para o app
const CREAM = '#FDFBF7';        
const VERDE_VIVO = '#2E6F40';   
const PETROLEO = '#0F262E';     
const TEXT_MID = '#768A7E';     
const BORDER = '#E3E8E5';       
const WHITE = '#FFFFFF';
const RED = '#C94A4A';
const ORANGE = '#E67E22';

export default function DetalhesIntercorrenciaCliente() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  
  const [comentario, setComentario] = useState('');
  const [imagemNova, setImagemNova] = useState(null);

  useEffect(() => {
    if (id) {
      fetchDetalhes();
    }
  }, [id]);

  const fetchDetalhes = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('intercorrencia')
        .select(`
          *,
          agendamentos!inner (
            id_agendamento,
            servico:id_servico ( nome_servico ),
            profissional:id_profissional ( usuario:id_usuario ( nome_usuario ) )
          )
        `)
        .eq('id_agendamento', id) 
        .single();

      if (error) {
        console.error("Erro ao buscar intercorrência:", error.message);
        throw error;
      }
      
      setData(data);
      if (data?.descricao_cliente) setComentario(data.descricao_cliente);

    } catch (error) {
      console.error("Erro Catch:", error);
    } finally {
      setLoading(false);
    }
  };

  const selecionarImagem = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImagemNova(result.assets[0].uri);
    }
  };

  const atualizarReclamacao = async () => {
    if (!comentario) return Alert.alert("Atenção", "O comentário não pode estar vazio.");

    try {
      setEnviando(true);
      let urlFinal = data?.imagem_url || null; 

      if (imagemNova) {
        const response = await fetch(imagemNova);
        const blob = await response.blob();
        const fileName = `reclamacao_ag_${id}_${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('intercorrencias')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from('intercorrencias')
          .getPublicUrl(fileName);
          
        urlFinal = publicUrl.publicUrl;
      }

      const { error } = await supabase
        .from('intercorrencia')
        .update({ 
          descricao_cliente: comentario,
          imagem_url: urlFinal 
        })
        .eq('id_agendamento', id);

      if (error) throw error;

      Alert.alert("Sucesso", "Sua reclamação foi atualizada!");
      router.back();
    } catch (error) {
      console.error("Erro no Update:", error);
      Alert.alert("Erro", "Falha ao atualizar.");
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={VERDE_VIVO} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Ionicons name="search-outline" size={48} color={TEXT_MID} style={{ marginBottom: 16 }} />
        <Text style={styles.notFoundText}>Nenhuma intercorrência vinculada ao agendamento #{id}.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnNotFoundBack}>
          <Text style={styles.btnEnviarText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const resolvida = data?.status === 'resolvido';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* BOTÃO VOLTAR NO TOPO */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={PETROLEO} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Minha Reclamação</Text>
        <Text style={styles.subtitle}>Gerencie os detalhes e acompanhe o status da disputa aberta.</Text>

        {/* CARD INFORMATIVO DA RECLAMAÇÃO */}
        <View style={styles.cardInfo}>
          <View style={styles.infoLine}>
            <Text style={styles.label}>Serviço</Text>
            <Text style={styles.value}>{data?.agendamentos?.servico?.nome_servico}</Text>
          </View>
          
          <View style={styles.infoLine}>
            <Text style={styles.label}>Profissional</Text>
            <Text style={styles.value}>{data?.agendamentos?.profissional?.usuario?.nome_usuario}</Text>
          </View>

          <View style={[styles.infoLine, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={styles.label}>Status do Processo</Text>
            <View style={[styles.statusBadge, { backgroundColor: resolvida ? '#EBF7EE' : '#FFF3E0' }]}>
              <Text style={[styles.statusBadgeText, { color: resolvida ? VERDE_VIVO : ORANGE }]}>
                {data?.status?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* RESPOSTA DO PROFISSIONAL (SE EXISTIR) */}
        {data?.descricao_profissional && (
          <View style={styles.sectionProfissional}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={PETROLEO} />
              <Text style={styles.sectionTitle}>Resposta do Profissional</Text>
            </View>
            <Text style={styles.descricaoTxt}>{data.descricao_profissional}</Text>
            {data?.imagem_url_defesa && (
              <Image source={{ uri: data.imagem_url_defesa }} style={styles.imgDefesa} />
            )}
          </View>
        )}

        {/* DECISÃO FINAL DO ADMINISTRADOR (CASO RESOLVIDO) */}
        {resolvida && (
          <View style={styles.vereditoCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="ribbon-outline" size={18} color={VERDE_VIVO} />
              <Text style={styles.vereditoTitle}>Decisão do Administrador</Text>
            </View>
            <Text style={styles.vereditoTxt}>{data?.veredito || 'Caso encerrado pelo administrador do sistema.'}</Text>
          </View>
        )}

        {/* DIVIDER VISUAL */}
        <View style={styles.divider} />

        {/* ÁREA DA SUA RECLAMAÇÃO ORIGINAL */}
        <View style={styles.defesaArea}>
          <Text style={styles.subSectionTitle}>Categoria da Ocorrência</Text>
          <Text style={styles.motivoTxt}>{data?.motivo_categoria}</Text>
          
          <Text style={[styles.subSectionTitle, { marginTop: 16 }]}>Seus Detalhes / Argumentação</Text>
          {!resolvida ? (
            <>
              <TextInput
                style={styles.input}
                multiline
                numberOfLines={4}
                value={comentario}
                onChangeText={setComentario}
                placeholder="Descreva detalhadamente o ocorrido..."
                placeholderTextColor="#A4B4AB"
              />
              <TouchableOpacity style={styles.btnFoto} onPress={selecionarImagem}>
                <Ionicons name="camera-outline" size={18} color={PETROLEO} style={{ marginRight: 6 }} />
                <Text style={styles.btnFotoText}>Alterar Imagem de Prova</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.closedCommentBox}>
              <Text style={styles.descricaoTxt}>{data?.descricao_cliente}</Text>
            </View>
          )}

          {/* EXIBIÇÃO DE MÍDIA / ANEXO DE PROVA */}
          {(imagemNova || data?.imagem_url) && (
            <View style={styles.imagePreviewContainer}>
              <Text style={styles.imageLabel}>Evidência Anexada:</Text>
              <Image source={{ uri: imagemNova || data?.imagem_url }} style={styles.miniImg} />
            </View>
          )}

          {/* BOTÃO SALVAR ALTERAÇÃO DA INTERCORRÊNCIA */}
          {!resolvida && (
            <TouchableOpacity 
              style={[styles.btnEnviar, enviando && { opacity: 0.7 }]} 
              onPress={atualizarReclamacao}
              disabled={enviando}
            >
              {enviando ? <ActivityIndicator color={WHITE} /> : <Text style={styles.btnEnviarText}>Atualizar Reclamação</Text>}
            </TouchableOpacity>
          )}
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
    padding: 24,
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
    marginBottom: 24,
  },
  cardInfo: { 
    backgroundColor: WHITE, 
    padding: 18, 
    borderRadius: 16, 
    marginBottom: 20, 
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  sectionProfissional: { 
    backgroundColor: WHITE, 
    padding: 16, 
    borderRadius: 14, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: PETROLEO 
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_MID,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8
  },
  motivoTxt: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: RED, 
    marginBottom: 4 
  },
  descricaoTxt: { 
    fontSize: 14, 
    color: PETROLEO, 
    lineHeight: 22,
    fontWeight: '500'
  },
  imgDefesa: { 
    width: '100%', 
    height: 180, 
    marginTop: 12, 
    borderRadius: 10,
    backgroundColor: CREAM 
  },
  divider: { 
    height: 1, 
    backgroundColor: BORDER, 
    marginVertical: 12 
  },
  vereditoCard: { 
    backgroundColor: '#EBF7EE', 
    padding: 16, 
    borderRadius: 14, 
    borderWidth: 1,
    borderColor: '#D4EDDA',
    marginBottom: 16 
  },
  vereditoTitle: { 
    fontWeight: '700', 
    color: VERDE_VIVO,
    fontSize: 14 
  },
  vereditoTxt: { 
    fontSize: 14, 
    color: PETROLEO, 
    lineHeight: 20,
    fontWeight: '500'
  },
  defesaArea: {
    marginTop: 8
  },
  input: { 
    backgroundColor: WHITE, 
    padding: 14, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: BORDER, 
    textAlignVertical: 'top', 
    fontSize: 15, 
    minHeight: 110,
    color: PETROLEO,
    fontWeight: '500'
  },
  closedCommentBox: {
    backgroundColor: WHITE,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER
  },
  btnFoto: { 
    backgroundColor: WHITE, 
    flexDirection: 'row', 
    paddingVertical: 10, 
    paddingHorizontal: 14,
    borderRadius: 10, 
    marginTop: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    alignSelf: 'flex-start'
  },
  btnFotoText: { 
    color: PETROLEO, 
    fontWeight: '600',
    fontSize: 13 
  },
  imagePreviewContainer: {
    marginTop: 20
  },
  imageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_MID,
    marginBottom: 8
  },
  miniImg: { 
    width: '100%', 
    height: 220, 
    borderRadius: 12, 
    resizeMode: 'cover', 
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER
  },
  btnEnviar: { 
    backgroundColor: VERDE_VIVO, 
    paddingVertical: 15, 
    borderRadius: 12, 
    marginTop: 24, 
    alignItems: 'center',
    shadowColor: VERDE_VIVO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  btnEnviarText: { 
    color: WHITE, 
    fontWeight: '600', 
    fontSize: 16,
    letterSpacing: 0.3
  },
  btnNotFoundBack: {
    backgroundColor: PETROLEO,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16
  },
  notFoundText: { 
    fontSize: 15, 
    color: TEXT_MID, 
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8
  }
});