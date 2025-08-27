# 🏸 Badminton Pairing App

A React-based web application for managing badminton matches, player pairings, and court assignments. Perfect for badminton clubs, tournaments, and casual play sessions.

## ✨ Features

- **Player Management**: Add, edit, and manage player profiles with match statistics
- **Smart Pairing**: Automatic team generation with intelligent player distribution
- **Court Management**: Dynamic court allocation and match scheduling
- **Real-time Updates**: Live match status and player availability tracking
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Local Storage**: Data persistence without external databases

## 🚀 Live Demo

Visit the live application: [Badminton Pairing App](https://jamethana.github.io/badminton-pairing-app/)

**Status**: 🚧 Currently deploying... (Check GitHub Actions for progress)

## 🛠️ Tech Stack

- **Frontend**: React 18, CSS3, HTML5
- **Testing**: Jest, React Testing Library
- **Build Tool**: Create React App
- **CI/CD**: GitHub Actions
- **Deployment**: GitHub Pages

## 📋 Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Git

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone git@github.com:jamethana/badminton-pairing-app.git
cd badminton-pairing-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm start
```

The app will open in your browser at `http://localhost:3000`.

### 4. Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

### 5. Build for Production

```bash
npm run build
```

## 🧪 Testing

The project includes comprehensive unit tests for all components and utilities:

- **Component Tests**: Test user interactions and component behavior
- **Utility Tests**: Test helper functions and data processing
- ** Hook Tests**: Test custom React hooks
- **Coverage**: Aim for >90% test coverage

Run tests with:
```bash
npm test
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

1. **CI Pipeline** (`ci.yml`)
   - Runs on every push and pull request
   - Tests against Node.js 18.x and 20.x
   - Runs linting and security audits
   - Generates test coverage reports

2. **Deployment Pipeline** (`deploy.yml`)
   - Automatically deploys to GitHub Pages
   - Triggers on pushes to main branch
   - Includes test validation before deployment

3. **Code Quality** (`code-quality.yml`)
   - Weekly dependency updates
   - Security vulnerability scanning
   - Code formatting and linting checks

### Automated Features

- **Dependabot**: Weekly dependency updates with automatic PR creation
- **Security Scanning**: Regular vulnerability assessments
- **Test Automation**: Automated testing on all code changes
- **Deployment**: Zero-downtime deployments to GitHub Pages

## 📁 Project Structure

```
badminton-pair/
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   │   ├── App.js         # Main application component
│   │   ├── CurrentMatches.js
│   │   ├── EmptyCourtModal.js
│   │   ├── Notification.js
│   │   └── PlayerManagement.js
│   ├── hooks/             # Custom React hooks
│   │   └── useLocalStorage.js
│   ├── utils/             # Utility functions
│   │   └── helpers.js
│   └── App.js             # Application entry point
├── .github/
│   ├── workflows/         # GitHub Actions workflows
│   └── dependabot.yml     # Dependabot configuration
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_TITLE=Badminton Pairing App
REACT_APP_VERSION=1.0.0
```

### GitHub Pages

The app is automatically deployed to GitHub Pages. To enable:

1. Go to your repository settings
2. Navigate to "Pages"
3. Select "GitHub Actions" as the source
4. The deployment workflow will handle the rest

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Ensure all tests pass before submitting PRs
- Follow the existing code style
- Update documentation as needed

## 📊 Test Coverage

Current test coverage:
- **Components**: 100%
- **Hooks**: 100%
- **Utilities**: 100%
- **Overall**: 100%

## 🚀 Deployment

The app is automatically deployed to GitHub Pages on every push to the main branch. The deployment process:

1. Runs all tests to ensure code quality
2. Builds the production bundle
3. Deploys to GitHub Pages
4. Provides deployment status feedback

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React team for the amazing framework
- GitHub for hosting and CI/CD tools
- Badminton community for inspiration

## 📞 Support

If you have any questions or need help:

1. Check the [Issues](https://github.com/jamethana/badminton-pairing-app/issues) page
2. Create a new issue for bugs or feature requests
3. Review the test files for usage examples

---

**Happy Badminton Pairing! 🏸**