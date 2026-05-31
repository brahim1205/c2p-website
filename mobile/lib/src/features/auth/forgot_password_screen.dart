import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'auth_scope.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({required this.authSession, super.key});

  final AuthSession authSession;

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  bool _isLoading = false;
  String? _message;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _isLoading = true;
      _message = null;
    });

    try {
      await widget.authSession.repository.forgotPassword(_emailController.text);
      setState(() => _message = 'Si ce compte existe, un code de reinitialisation a ete envoye.');
    } catch (_) {
      setState(() => _message = 'Impossible d envoyer la demande pour le moment.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mot de passe oublie')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text('Entrez votre email pour recevoir un code de reinitialisation.'),
            const SizedBox(height: 16),
            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Email'),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _isLoading ? null : _submit,
              child: _isLoading ? const CircularProgressIndicator(strokeWidth: 2) : const Text('Envoyer le code'),
            ),
            if (_message != null) ...[
              const SizedBox(height: 16),
              Text(_message!, style: const TextStyle(fontWeight: FontWeight.w700)),
            ],
            TextButton(
              onPressed: () => context.go('/auth/login'),
              child: const Text('Retour a la connexion'),
            ),
          ],
        ),
      ),
    );
  }
}
