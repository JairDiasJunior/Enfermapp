import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ActivityIndicator, 
  Image, 
  Alert,
  Animated,
  ScrollView 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../services/api';

// ─── PALETA PETRÓLEO + OLIVA ──────────────────────────────────────────────────
const PETROLEO      = '#1B4D4D';
const PETROLEO_VIVO = '#2A7A7A';
const PETROLEO_BG   = '#E0EBEB';
const OLIVA         = '#5C6B2E';
const OLIVA_VIVA    = '#7A8F3A';
const OLIVA_BG      = '#ECF0DC';
const CREAM         = '#F7F5F0';
const WHITE         = '#FFFFFF';
const TEXT_DARK     = '#1A1A1A';
const TEXT_MID      = '#6B6B6B';
const BORDER        = '#E0DDD6';
const RED           = '#C94A4A';
// ───────────────────────────────────────────────────────────────────────────────

export default function CadastroPasso4() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [image, setImage] = useState(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [urlFinal, setUrlFinal] = useState(null);
  const [documentoAprovado, setDocumentoAprovado] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (isWaiting && params.id_profissional) {
      console.log("Iniciando escuta em tempo real para o profissional:", params.id_profissional);

      const channel = supabase
        .channel('check_aprovacao')
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE',
            schema: 'public',
            table: 'profissional',
            filter: `id_profissional=eq.${params.id_profissional}`
          },
          (payload) => {
            const novoStatus = payload.new.status_aprovacao;
            console.log("Mudança detectada no status de aprovação:", novoStatus);
            
            if (novoStatus === 'aprovado') {
              setDocumentoAprovado(true);
            } 
            else if (novoStatus === 'recusado' || novoStatus === 'rejeitado') {
              // Se o admin recusar, tira da tela de espera e avisa o profissional
              setIsWaiting(false);
              setDocumentoAprovado(false);
              Alert.alert(
                "Documento Recusado", 
                "A imagem do seu COREN não pôde ser validada pelo administrador. Por favor, certifique-se de que a foto está nítida e tente enviar novamente."
              );
            }
          }
        )
        .subscribe((status) => {
          console.log("Status da conexão Realtime:", status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isWaiting, params.id_profissional]);

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.97, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permissão Necessária", "Precisamos de acesso às suas fotos.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, 
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSend = async () => {
    if (!image) {
      Alert.alert("Atenção", "Por favor, anexe a imagem do seu COREN.");
      return;
    }

    animateButton();
    setIsUploading(true);

    try {
      const response = await fetch(image);
      const arrayBuffer = await response.arrayBuffer();
      const fileName = `coren_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('documentos_profissionais')
        .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('documentos_profissionais')
        .getPublicUrl(fileName);

      const url = publicData.publicUrl;
      setUrlFinal(url);

      const { error: updateError } = await supabase
        .from('profissional')
        .update({ 
          coren_url: url, 
          status_aprovacao: 'pendente' 
        })
        .eq('id_profissional', params.id_profissional);

      if (updateError) throw updateError;

      setIsWaiting(true);
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não conseguimos salvar a foto.");
    } finally {
      setIsUploading(false);
    }
  };

  // Tela de aguardando aprovação
  if (isWaiting) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: '80%' }]} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            
            <View style={styles.header}>
              <Text style={styles.stepNumber}>04</Text>
              <View style={styles.stepDivider}>
                <Text style={styles.stepDividerText}>/</Text>
                <Text style={styles.stepTotal}>5</Text>
              </View>
              <Text style={styles.stepLabel}>Verificação</Text>
            </View>

            <View style={styles.waitingCard}>
              {!documentoAprovado ? (
                <>
                  <View style={styles.statusCirclePending}>
                    <ActivityIndicator size="large" color={PETROLEO} />
                  </View>
                  <Text style={styles.waitingTitle}>Análise em andamento</Text>
                  <Text style={styles.waitingDescription}>
                    Nossa equipe está revisando seu documento COREN.
                    {'\n'}
                    Você será notificado assim que for aprovado.
                  </Text>
                  <View style={styles.pulseDots}>
                    <Animated.View style={[styles.dot, styles.dot1]} />
                    <Animated.View style={[styles.dot, styles.dot2]} />
                    <Animated.View style={[styles.dot, styles.dot3]} />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.statusCircleApproved}>
                    <Text style={styles.approvedIcon}>✓</Text>
                  </View>
                  <Text style={styles.approvedTitle}>Documento Aprovado! 🎉</Text>
                  <Text style={styles.approvedDescription}>
                    Seu registro COREN foi verificado com sucesso.
                  </Text>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <TouchableOpacity
                      style={styles.continueButton}
                      onPress={() => router.push({
                        pathname: '/cadastro_passo5',
                        params: { ...params, coren_url: urlFinal } 
                      })}
                    >
                      <Text style={styles.continueButtonText}>Escolher Plano</Text>
                      <Text style={styles.arrowRight}>→</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </>
              )}
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Tela de upload / reenvio caso seja recusado
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: '80%' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          
          <View style={styles.header}>
            <Text style={styles.stepNumber}>04</Text>
            <View style={styles.stepDivider}>
              <Text style={styles.stepDividerText}>/</Text>
              <Text style={styles.stepTotal}>5</Text>
            </View>
            <Text style={styles.stepLabel}>Documentação</Text>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.title}>Verificação</Text>
            <Text style={styles.titleAccent}>profissional</Text>
          </View>

          <View style={styles.uploadSection}>
            <Text style={styles.sectionLabel}>Carteirinha COREN</Text>
            
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.uploadCard}
              onPress={pickImage}
              disabled={isUploading}
            >
              {image ? (
                <Image source={{ uri: image }} style={styles.previewImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <View style={styles.uploadIconCircle}>
                    <Text style={styles.uploadIcon}>📷</Text>
                  </View>
                  <Text style={styles.uploadTitle}>Toque para anexar</Text>
                  <Text style={styles.uploadSubtitle}>
                    Foto da carteirinha COREN{'\n'}frente ou verso
                  </Text>
                </View>
              )}
              
              {image && (
                <View style={styles.changeOverlay}>
                  <Text style={styles.changeText}>📸 Trocar imagem</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>🔒</Text>
              <Text style={styles.infoText}>
                Seu documento é criptografado e usado apenas para validação. 
                Não será compartilhado.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.sendButton,
                  (!image || isUploading) && styles.sendButtonDisabled
                ]}
                onPress={handleSend}
                disabled={!image || isUploading}
              >
                {isUploading ? (
                  <>
                    <ActivityIndicator color={WHITE} size="small" />
                    <Text style={styles.sendButtonText}>Enviando...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.sendButtonText}>
                      {image ? 'Enviar documento' : 'Selecione uma imagem'}
                    </Text>
                    <Text style={styles.arrowRight}>
                      {image ? '→' : ''}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {!isUploading && (
              <TouchableOpacity 
                onPress={() => router.back()} 
                style={styles.backButton}
              >
                <Text style={styles.backText}>← Voltar</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  progressBarContainer: { height: 4, backgroundColor: BORDER },
  progressBarFill: { height: '100%', backgroundColor: PETROLEO },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 28 },
  stepNumber: { fontSize: 48, fontWeight: '200', color: PETROLEO, letterSpacing: -2 },
  stepDivider: { flexDirection: 'row', alignItems: 'baseline', marginLeft: 4 },
  stepDividerText: { fontSize: 24, color: TEXT_MID, fontWeight: '300' },
  stepTotal: { fontSize: 20, color: TEXT_MID, fontWeight: '400', marginLeft: 2 },
  stepLabel: { fontSize: 13, color: OLIVA, marginLeft: 'auto', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' },
  titleSection: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '600', color: TEXT_DARK, letterSpacing: -0.5 },
  titleAccent: { fontSize: 28, fontWeight: '300', color: PETROLEO_VIVO, letterSpacing: -0.5 },
  uploadSection: { marginBottom: 'auto' },
  sectionLabel: { fontSize: 14, color: OLIVA, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  uploadCard: { backgroundColor: WHITE, borderRadius: 14, height: 280, overflow: 'hidden', borderWidth: 2, borderColor: BORDER, borderStyle: 'dashed', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 4 },
  uploadPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  uploadIconCircle: { width: 80, height: 80, borderRadius: 20, backgroundColor: PETROLEO_BG, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  uploadIcon: { fontSize: 36 },
  uploadTitle: { fontSize: 18, fontWeight: '600', color: PETROLEO, marginBottom: 8 },
  uploadSubtitle: { fontSize: 14, color: TEXT_MID, textAlign: 'center', lineHeight: 20 },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  changeOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(27, 77, 77, 0.85)', paddingVertical: 16, alignItems: 'center' },
  changeText: { color: WHITE, fontSize: 14, fontWeight: '600' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 20, padding: 16, backgroundColor: PETROLEO_BG, borderRadius: 14, borderLeftWidth: 3, borderLeftColor: PETROLEO },
  infoIcon: { fontSize: 18, marginRight: 12 },
  infoText: { flex: 1, fontSize: 13, color: PETROLEO, lineHeight: 18 },
  footer: { marginTop: 24, alignItems: 'center' },
  sendButton: { backgroundColor: PETROLEO, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 48, borderRadius: 14, shadowColor: PETROLEO, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8, minWidth: 280, gap: 8 },
  sendButtonDisabled: { backgroundColor: BORDER, shadowOpacity: 0, elevation: 0 },
  sendButtonText: { color: WHITE, fontSize: 16, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  arrowRight: { color: WHITE, fontSize: 18 },
  backButton: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24 },
  backText: { color: PETROLEO_VIVO, fontSize: 14, fontWeight: '500' },
  waitingCard: { backgroundColor: WHITE, borderRadius: 14, padding: 32, alignItems: 'center', marginTop: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 6 },
  statusCirclePending: { width: 100, height: 100, borderRadius: 50, backgroundColor: PETROLEO_BG, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  statusCircleApproved: { width: 100, height: 100, borderRadius: 50, backgroundColor: OLIVA_VIVA, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  approvedIcon: { fontSize: 48, color: WHITE, fontWeight: '700' },
  waitingTitle: { fontSize: 22, fontWeight: '600', color: TEXT_DARK, marginBottom: 12 },
  waitingDescription: { fontSize: 14, color: TEXT_MID, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  approvedTitle: { fontSize: 24, fontWeight: '600', color: OLIVA, marginBottom: 12 },
  approvedDescription: { fontSize: 14, color: TEXT_MID, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  continueButton: { backgroundColor: PETROLEO, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 14, shadowColor: PETROLEO, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8 },
  continueButtonText: { color: WHITE, fontSize: 16, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  pulseDots: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PETROLEO },
  dot1: { opacity: 0.3 },
  dot2: { opacity: 0.6 },
  dot3: { opacity: 1 },
});