//Editar dados
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/api';

// Paleta de cores idêntica às outras telas do ecossistema do app
const CREAM = '#FDFBF7';        
const VERDE_VIVO = '#2E6F40';   
const PETROLEO = '#0F262E';     
const TEXT_MID = '#768A7E';     
const BORDER = '#E3E8E5';       
const WHITE = '#FFFFFF';
const RED = '#C94A4A';

export default function EditarDados() {
  const router = useRouter();
  const [tel, setTel] = useState("");
  const [pag, setPag] = useState("");
  const [loading, setLoading] = useState(false);

  // Função para aplicar a máscara de telefone (00) 00000-0000
  const mascaraTelefone = (valor) => {
    return valor
      .replace(/\D/g, "") 
      .replace(/(\d{2})(\d)/, "($1) $2") 
      .replace(/(\d{5})(\d)/, "$1-$2") 
      .replace(/(-\d{4})\d+?$/, "$1"); 
  };

  const handleTelefoneChange = (text) => {
    setTel(mascaraTelefone(text));
  };

  const salvar = async () => {
    if (!tel || !pag) {
      Alert.alert("Aviso", "Preencha todos os campos antes de salvar.");
      return;
    }

    try {
      setLoading(true);
      const nomeSalvo = await AsyncStorage.getItem('nome_logado');

      if (!nomeSalvo) {
        Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
        return;
      }

      const { error } = await supabase
        .from('usuario')
        .update({ 
          telefone: tel, 
          pagamento_usado: pag 
        })
        .eq('nome_usuario', nomeSalvo); 

      if (error) throw error;

      Alert.alert("Sucesso", "Dados salvos no banco de dados!");
      router.back();

    } catch (error) {
      Alert.alert("Erro ao salvar", error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* BOTÃO VOLTAR / CANCELAR NO TOPO */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={PETROLEO} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Editar Informações</Text>
        <Text style={styles.subtitle}>Mantenha seus dados de contato e pagamento atualizados.</Text>
        
        {/* FORMULÁRIO */}
        <View style={styles.formCard}>
          
          {/* CAMPO TELEFONE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={TEXT_MID} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="(00) 00000-0000"
                placeholderTextColor="#A4B4AB"
                value={tel}
                onChangeText={handleTelefoneChange}
                keyboardType="phone-pad"
                maxLength={15} 
              />
            </View>
          </View>

          {/* CAMPO FORMA DE PAGAMENTO */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Forma de Pagamento</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="card-outline" size={20} color={TEXT_MID} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Ex: Cartão de Crédito ou Pix"
                placeholderTextColor="#A4B4AB"
                value={pag}
                onChangeText={setPag}
                autoCapitalize="sentences"
              />
            </View>
          </View>

        </View>

        {/* BOTÃO SALVAR ALTERAÇÕES */}
        <TouchableOpacity 
          style={[styles.btnSalvar, loading && { opacity: 0.8 }]} 
          onPress={salvar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={WHITE} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color={WHITE} style={{ marginRight: 8 }} />
              <Text style={styles.btnText}>Salvar Alterações</Text>
            </>
          )}
        </TouchableOpacity>

        {/* BOTÃO CANCELAR SECUNDÁRIO */}
        <TouchableOpacity 
          style={styles.btnCancelar} 
          onPress={() => router.back()}
        >
          <Text style={styles.btnCancelarText}>Cancelar</Text>
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
    fontSize: 15,
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
  formCard: {
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
    marginBottom: 24
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: { 
    fontSize: 12, 
    fontWeight: '600',
    color: PETROLEO,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8 
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CREAM,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: { 
    flex: 1,
    color: PETROLEO,
    fontSize: 15,
    fontWeight: '500',
    height: '100%',
  },
  btnSalvar: { 
    backgroundColor: VERDE_VIVO, 
    height: 52, 
    borderRadius: 12, 
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: VERDE_VIVO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  btnText: { 
    color: WHITE, 
    fontSize: 16, 
    fontWeight: '600',
    letterSpacing: 0.3
  },
  btnCancelar: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  btnCancelarText: {
    color: RED,
    fontSize: 15,
    fontWeight: '600',
  }
});