class AuthUser {
  const AuthUser({
    required this.id,
    required this.email,
    required this.role,
    required this.firstName,
    required this.lastName,
  });

  final String id;
  final String email;
  final String role;
  final String firstName;
  final String lastName;

  String get displayName => '$firstName $lastName'.trim().isEmpty ? email : '$firstName $lastName';

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? 'client',
      firstName: json['firstName']?.toString() ?? '',
      lastName: json['lastName']?.toString() ?? '',
    );
  }
}

class UserRoleOption {
  const UserRoleOption({
    required this.id,
    required this.title,
    required this.description,
    required this.icon,
  });

  final String id;
  final String title;
  final String description;
  final String icon;
}

const userRoleOptions = <UserRoleOption>[
  UserRoleOption(
    id: 'client',
    title: 'Client',
    description: 'Rechercher des prestations, publier un besoin et suivre vos demandes.',
    icon: 'person_search',
  ),
  UserRoleOption(
    id: 'prestataire',
    title: 'Prestataire',
    description: 'Proposer vos services professionnels.',
    icon: 'work',
  ),
  UserRoleOption(
    id: 'formateur',
    title: 'Formateur',
    description: 'Creer et dispenser des formations.',
    icon: 'school',
  ),
  UserRoleOption(
    id: 'apprenant',
    title: 'Apprenant',
    description: 'Suivre des formations et developper vos competences.',
    icon: 'menu_book',
  ),
  UserRoleOption(
    id: 'porteur',
    title: 'Porteur de projet',
    description: 'Soumettre et developper votre projet.',
    icon: 'lightbulb',
  ),
  UserRoleOption(
    id: 'partenaire',
    title: 'Partenaire',
    description: 'Intervenir comme partenaire financier ou technique.',
    icon: 'handshake',
  ),
];
