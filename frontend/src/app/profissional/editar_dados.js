import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { supabase } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Paleta de cores oficial do app
const CREAM = '#FDFBF7';        
const VERDE_VIVO = '#2E6F40';   
const PETROLEO = '#0F262E';     
const TEXT_MID = '#768A7E';     
const BORDER = '#E3E8E5';       
const WHITE = '#FFFFFF';

export default function EditarDadosProfissional() {
  const router = useRouter();
  
  // Estados para controle de carregamento
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  // Campos do formulário mapeados com o Banco de Dados
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [pagamentoUsado, setPagamentoUsado] = useState(''); // 'Dinheiro', 'Cartão' ou 'Pix'
  const [descricao, setDescricao] = useState('');
  
  // Estados para a tabela 'horarios_profissional'
  const [tipoHorario, setTipoHorario] = useState('definido'); // 'definido' ou 'flexivel'
  const [horarioInicio, setHorarioInicio] = useState('');
  const [horarioFim, setHorarioFim] = useState('');

  const [idUsuario, setIdUsuario] = useState(null);
  const [idProfissional, setIdProfissional] = useState(null);

  // Aplica a máscara (00) 00000-0000 em tempo real
  const aplicarMascaraTelefone = (text) => {
    const apenasNumeros = text.replace(/\D/g, '');
    let formatado = apenasNumeros;

    if (formatado.length > 2) {
      formatado = `(${formatado.substring(0, 2)}) ${formatado.substring(2)}`;
    }
    if (formatado.length > 10) {
      formatado = `${formatado.substring(0, 10)}-${formatado.substring(10, 15)}`;
    }
    return formatado.substring(0, 15);
  };

  useEffect(() => {
    carregarDadosPerfil();
  }, []);

  const carregarDadosPerfil = async () => {
    try {
      setLoading(true);
      const idStorage = await AsyncStorage.getItem('id_usuario');
      let usuario = null;

      if (idStorage) {
        const { data } = await supabase
          .from('usuario')
          .select('id_usuario, nome_usuario, telefone, pagamento_usado')
          .eq('id_usuario', idStorage)
          .single();
        if (data) usuario = data;
      }

      if (!usuario) {
        const nomeLogado = await AsyncStorage.getItem('nome_logado');
        const { data } = await supabase
          .from('usuario')
          .select('id_usuario, nome_usuario, telefone, pagamento_usado')
          .eq('nome_usuario', nomeLogado)
          .single();
        if (!data) throw new Error("Usuário não encontrado.");
        usuario = data;
      }

      // Preenche dados da tabela 'usuario'
      setIdUsuario(usuario.id_usuario);
      setNome(usuario.nome_usuario);
      setTelefone(aplicarMascaraTelefone(usuario.telefone || ''));
      setPagamentoUsado(usuario.pagamento_usado || '');
      await AsyncStorage.setItem('id_usuario', String(usuario.id_usuario));

      // Busca dados da tabela 'profissional'
      const { data: profesional } = await supabase
        .from('profissional')
        .select('id_profissional, descricao')
        .eq('id_usuario', usuario.id_usuario)
        .maybeSingle();

      if (profesional) {
        setIdProfissional(profesional.id_profissional);
        setDescricao(profesional.descricao || '');

        // Busca dados da tabela 'horarios_profissional'
        const { data: horario } = await supabase
          .from('horarios_profissional')
          .select('tipo_horario, horario_inicio, horario_fim')
          .eq('id_profissional', profesional.id_profissional)
          .maybeSingle();

        if (horario) {
          setTipoHorario(horario.tipo_horario || 'definido');
          if (horario.tipo_horario === 'flexivel') {
            setHorarioInicio('');
            setHorarioFim('');
          } else {
            setHorarioInicio(horario.horario_inicio || '');
            setHorarioFim(horario.horario_fim || '');
          }
        }
      }

    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível carregar as informações.");
    } finally {
      setLoading(false);
    }
  };

  const salvarAlteracoes = async () => {
    if (!nome.trim() || !telefone.trim()) {
      Alert.alert("Atenção", "Os campos Nome e Telefone são obrigatórios.");
      return;
    }

    if (!idUsuario) {
      Alert.alert("Erro", "ID do usuário não encontrado. Recarregue a página.");
      return;
    }

    try {
      setSalvando(true);

      // 1. Salva na tabela 'usuario' (telefone e pagamento_usado inclusos aqui)
      const { error: userError } = await supabase
        .from('usuario')
        .update({ 
          nome_usuario: nome, 
          telefone: telefone, 
          pagamento_usado: pagamentoUsado 
        })
        .eq('id_usuario', idUsuario);

      if (userError) {
        console.error("Erro na tabela usuario:", userError);
        throw new Error(`Erro na tabela Usuário: ${userError.message}`);
      }

      // 2. Salva na tabela 'profissional' (descricao inclusa aqui)
      const { error: profError } = await supabase
        .from('profissional')
        .update({ descricao: descricao })
        .eq('id_usuario', idUsuario);

      if (profError) {
        console.error("Erro na tabela profissional:", profError);
        throw new Error(`Erro na tabela Profissional: ${profError.message}`);
      }

      // Define as strings de horário com base na regra de negócio escolhida
      const inicioFinal = tipoHorario === 'flexivel' ? '00:00' : horarioInicio;
      const fimFinal = tipoHorario === 'flexivel' ? '23:59' : horarioFim;

      // 3. Salva na tabela 'horarios_profissional' via Upsert
      let profissionalIdAtual = idProfissional;
      
      // Dupla checagem caso o estado tenha se perdido
      if (!profissionalIdAtual) {
        const { data: profDados } = await supabase
          .from('profissional')
          .select('id_profissional')
          .eq('id_usuario', idUsuario)
          .single();
        
        if (profDados) {
          profissionalIdAtual = profDados.id_profissional;
          setIdProfissional(profDados.id_profissional);
        }
      }

      if (profissionalIdAtual) {
        const { error: horError } = await supabase
          .from('horarios_profissional')
          .upsert({
            id_profissional: profissionalIdAtual,
            tipo_horario: tipoHorario,
            horario_inicio: inicioFinal,
            horario_fim: fimFinal
          }, { onConflict: 'id_profissional' });

        if (horError) {
          console.error("Erro na tabela horarios:", horError);
          throw new Error(`Erro na tabela Horários: ${horError.message}`);
        }
      } else {
        throw new Error("Não foi possível vincular os horários porque o ID do profissional não foi mapeado.");
      }

      // Sincroniza o storage local para evitar dessincronização de telas
      await AsyncStorage.setItem('nome_logado', nome);
      
      Alert.alert("Sucesso", "Perfil atualizado com sucesso!", [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (error) {
      console.error("Erro completo ao salvar:", error);
      Alert.alert("Falha ao Salvar", error.message || "Erro desconhecido.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={PETROLEO} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={VERDE_VIVO} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* NOME COMPLETO */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nome Completo</Text>
            <TextInput style={styles.input} value={nome} onChangeText={setNome} />
          </View>

          {/* TELEFONE COM MÁSCARA */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Telefone de Contato</Text>
            <TextInput 
              style={styles.input} 
              value={telefone} 
              keyboardType="phone-pad"
              placeholder="(00) 00000-0000"
              onChangeText={(t) => setTelefone(aplicarMascaraTelefone(t))} 
            />
          </View>

          {/* FORMA DE PAGAMENTO RECEBIDO */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Forma de Recebimento Principal</Text>
            <View style={styles.rowButtons}>
              {['Dinheiro', 'Cartão', 'Pix'].map((tipo) => (
                <TouchableOpacity
                  key={tipo}
                  style={[styles.selectorButton, pagamentoUsado === tipo && styles.selectorButtonActive]}
                  onPress={() => setPagamentoUsado(tipo)}
                >
                  <Text style={[styles.selectorText, pagamentoUsado === tipo && styles.selectorTextActive]}>{tipo}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* DESCRIÇÃO / BIOGRAFIA */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Descrição / Biografia Profissional</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              value={descricao} 
              onChangeText={setDescricao} 
              multiline 
              numberOfLines={4}
              textAlignVertical="top"
              placeholder="Fale um pouco sobre seu trabalho..."
            />
          </View>

          {/* CONFIGURAÇÃO DE HORÁRIO */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tipo de Horário de Atendimento</Text>
            <View style={styles.rowButtons}>
              <TouchableOpacity
                style={[styles.selectorButton, tipoHorario === 'definido' && styles.selectorButtonActive]}
                onPress={() => setTipoHorario('definido')}
              >
                <Text style={[styles.selectorText, tipoHorario === 'definido' && styles.selectorTextActive]}>Hora Fixa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectorButton, tipoHorario === 'flexivel' && styles.selectorButtonActive]}
                onPress={() => setTipoHorario('flexivel')}
              >
                <Text style={[styles.selectorText, tipoHorario === 'flexivel' && styles.selectorTextActive]}>Sem hora fixa</Text>
              </TouchableOpacity>
            </View>
          </View>

          {tipoHorario === 'definido' && (
            <View style={styles.rowHorarios}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Início</Text>
                <TextInput style={styles.input} value={horarioInicio} onChangeText={setHorarioInicio} placeholder="08:00" maxLength={5} />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Fim</Text>
                <TextInput style={styles.input} value={horarioFim} onChangeText={setHorarioFim} placeholder="18:00" maxLength={5} />
              </View>
            </View>
          )}

          {/* BOTÃO DE SALVAR */}
          <TouchableOpacity 
            style={[styles.saveButton, salvando && styles.saveButtonDisabled]}
            onPress={salvarAlteracoes}
            disabled={salvando}
          >
            {salvando ? <ActivityIndicator size="small" color={WHITE} /> : <Text style={styles.saveButtonText}>Salvar Alterações</Text>}
          </TouchableOpacity>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderColor: BORDER, backgroundColor: CREAM },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 4 },
  backButtonText: { color: PETROLEO, fontSize: 15, fontWeight: '500' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: PETROLEO },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: PETROLEO, marginBottom: 8 },
  input: { backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, height: 54, fontSize: 15, color: PETROLEO, fontWeight: '500' },
  textArea: { height: 100, paddingTop: 14 },
  rowButtons: { flexDirection: 'row', gap: 10 },
  selectorButton: { flex: 1, height: 48, backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  selectorButtonActive: { backgroundColor: VERDE_VIVO, borderColor: VERDE_VIVO },
  selectorText: { fontSize: 14, fontWeight: '600', color: TEXT_MID },
  selectorTextActive: { color: WHITE },
  rowHorarios: { flexDirection: 'row', gap: 16 },
  saveButton: { backgroundColor: VERDE_VIVO, borderRadius: 16, height: 56, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: WHITE, fontSize: 16, fontWeight: '700' }
});