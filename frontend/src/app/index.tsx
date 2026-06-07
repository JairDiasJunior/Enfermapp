import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

// ─── PALETA PETRÓLEO + OLIVA (mesma do LoginScreen) ───────────────────────────
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
// ──────────────────────────────────────────────────────────────────────────────

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Marca decorativa */}
        <View style={styles.accentBar} />

        {/* Título */}
        <View style={styles.titleWrapper}>
          <Text style={styles.titleMain}>Enferma</Text>
          <Text style={styles.titleAccent}>pp</Text>
        </View>

        <Text style={styles.subtitle}>Cuidado com precisão</Text>

        {/* Linha divisória */}
        <View style={styles.divider} />

        {/* Botões */}
        <View style={styles.buttonContainer}>

          {/* Login — Petróleo sólido (mesmo estilo do nextButton do Login) */}
          <TouchableOpacity
            style={[styles.button, styles.loginButton]}
            onPress={() => router.push('/login')}
            activeOpacity={0.85}
          >
            <Text style={styles.loginButtonText}>LOGIN</Text>
          </TouchableOpacity>

          {/* Cadastro — ghost com borda Oliva */}
          <TouchableOpacity
            style={[styles.button, styles.registerButton]}
            onPress={() => router.push('/cadastro')}
            activeOpacity={0.85}
          >
            <Text style={styles.registerButtonText}>CADASTRE-SE</Text>
          </TouchableOpacity>

        </View>

        {/* Rodapé */}
        <Text style={styles.footer}>Plataforma de gestão em enfermagem</Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CREAM,          // mesmo fundo do LoginScreen
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,            // mesmo padding horizontal do Login
  },

  accentBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: OLIVA_VIVA,     // mesma cor dos labels do Login
    marginBottom: 28,
  },

  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },

  // "Bem-vindo" do Login usa fontWeight 700 + TEXT_DARK
  titleMain: {
    fontSize: 46,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: TEXT_DARK,
  },

  // "de volta" do Login usa fontWeight 300 + PETROLEO_VIVO
  titleAccent: {
    fontSize: 46,
    fontWeight: '300',
    letterSpacing: -0.5,
    color: PETROLEO_VIVO,
  },

  // Mesmo estilo do inputLabel do Login (uppercase + oliva)
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: OLIVA,
    textTransform: 'uppercase',
    marginBottom: 40,
  },

  divider: {
    width: '40%',
    height: 1,
    backgroundColor: BORDER,         // mesmo BORDER do Login
    marginBottom: 48,
  },

  buttonContainer: {
    width: '100%',
    gap: 16,
  },

  button: {
    width: '100%',
    height: 54,                       // mesma altura dos inputs do Login
    borderRadius: 14,                 // mesmo borderRadius do nextButton
    justifyContent: 'center',
    alignItems: 'center',
  },

  // nextButton do LoginScreen
  loginButton: {
    backgroundColor: PETROLEO,
    shadowColor: PETROLEO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  loginButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Ghost — borda OLIVA, sem sombra
  registerButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: OLIVA,
  },

  registerButtonText: {
    color: OLIVA,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Mesmo hintText do Login
  footer: {
    marginTop: 48,
    fontSize: 13,
    fontWeight: '500',
    color: OLIVA_VIVA,
    textAlign: 'center',
  },
});