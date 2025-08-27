# 🏸 Badminton Pairing App (React.js)

A modern, responsive React.js application for managing badminton players and generating fair match pairings. Built with React hooks, custom components, and local storage persistence.

## ✨ Features

### 🎯 **Core Functionality**
- **Player Management**: Add, edit, remove, and toggle active/inactive status
- **Smart Pairing**: Advanced algorithm to avoid repeat partnerships and opponents
- **Dynamic Courts**: Add/remove courts with real-time validation
- **Match Tracking**: Complete matches, record wins/losses, and manage player statistics
- **Available Pool**: Intelligent player pool management for continuous gameplay

### 🎨 **Modern UI/UX**
- **Responsive Design**: Mobile-first approach with CSS Grid and Flexbox
- **Interactive Modals**: Clean, accessible modal dialogs for all actions
- **Real-time Updates**: Instant feedback and auto-save functionality
- **Visual Indicators**: Clear status indicators for active/inactive players
- **Smooth Animations**: CSS transitions and fade-in effects

### 🔧 **Technical Features**
- **React Hooks**: Modern functional components with useState, useEffect, and useCallback
- **Custom Hooks**: useLocalStorage for persistent state management
- **Component Architecture**: Modular, reusable components
- **Local Storage**: Data persistence across browser sessions
- **Responsive CSS**: CSS custom properties and media queries

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd badminton-pairing-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Build for Production
```bash
npm run build
```

## 🏗️ Architecture

### **Component Structure**
```
src/
├── components/
│   ├── App.js                 # Main application component
│   ├── CurrentMatches.js      # Match display and court management
│   ├── PlayerManagement.js    # Player CRUD operations
│   ├── PlayerCard.js          # Individual player display
│   ├── PlayerEditModal.js     # Player editing interface
│   ├── CourtOptionsModal.js   # Match winner selection
│   ├── EmptyCourtModal.js     # Court filling interface
│   └── Notification.js        # Toast notifications
├── hooks/
│   └── useLocalStorage.js     # Custom hook for persistence
├── utils/
│   └── helpers.js             # Utility functions
├── index.js                   # Application entry point
├── index.css                  # Global styles and CSS variables
└── App.js                     # Main App component
```

### **State Management**
- **React Hooks**: Local state management with useState
- **Custom Hooks**: useLocalStorage for persistent data
- **Props Drilling**: Clean data flow between components
- **Callback Functions**: Efficient event handling with useCallback

### **Data Flow**
1. **App.js**: Central state management and business logic
2. **Components**: Receive props and callbacks for actions
3. **Local Storage**: Automatic persistence of all data
4. **Real-time Updates**: Immediate UI updates on state changes

## 🎮 How to Use

### **Adding Players**
1. Enter player name in the input field
2. Click "Add Player" button
3. Player appears in the Player Management section

### **Generating Matches**
1. Ensure you have at least 4 active players
2. Click "Generate Matches" button
3. Matches are created for all available courts
4. Players are automatically assigned with smart pairing

### **Managing Matches**
1. **Complete a Match**: Click on an occupied court
2. **Select Winner**: Choose Team 1, Team 2, or Draw
3. **Fill Empty Court**: Click on empty court to add new players
4. **Add/Remove Courts**: Use court management buttons

### **Player Management**
1. **Edit Player**: Click on any player card
2. **Toggle Status**: Switch between Active/Inactive
3. **Update Name**: Real-time name editing with validation
4. **Remove Player**: Delete players with confirmation
5. **Reset Stats**: Clear all match counts and history

## 🧠 Smart Pairing Algorithm

### **Anti-Repeat Logic**
- **Previous Partnerships**: Tracks teammate and opponent pairs
- **Scoring System**: Penalizes repeat partnerships (teammates +2, opponents +1)
- **Best Formation**: Selects formation with lowest repeat score
- **Random Distribution**: Ensures variety in player combinations

### **Court Management**
- **Dynamic Courts**: Add/remove courts as needed
- **Validation**: Prevents removal of occupied courts
- **Player Pool**: Maintains available players for continuous play
- **Smart Filling**: Automatically fills empty courts with best formations

## 🎨 Styling & Design

### **CSS Architecture**
- **CSS Custom Properties**: Consistent theming with CSS variables
- **Component-Specific Styles**: Modular CSS for each component
- **Responsive Design**: Mobile-first approach with breakpoints
- **Modern Aesthetics**: Clean, professional appearance

### **Visual Features**
- **Hover Effects**: Interactive feedback on all clickable elements
- **Status Indicators**: Clear visual distinction for active/inactive players
- **Color Coding**: Consistent color scheme for different states
- **Animations**: Smooth transitions and fade-in effects

## 📱 Responsive Design

### **Breakpoints**
- **Mobile**: < 768px - Single column layout
- **Tablet**: 768px - 1024px - Adaptive grid layouts
- **Desktop**: > 1024px - Full multi-column layouts

### **Mobile Optimizations**
- **Touch-Friendly**: Appropriate button sizes and spacing
- **Stacked Layouts**: Vertical arrangements for small screens
- **Simplified Navigation**: Streamlined mobile interface

## 🔧 Customization

### **Adding New Features**
1. **New Components**: Create in `src/components/`
2. **Custom Hooks**: Add to `src/hooks/`
3. **Utility Functions**: Place in `src/utils/`
4. **Styling**: Add CSS to `src/index.css`

### **Modifying Styles**
- **CSS Variables**: Update values in `:root` selector
- **Component Styles**: Modify specific component CSS
- **Responsive Rules**: Adjust media query breakpoints

## 🚀 Performance Features

### **Optimizations**
- **React.memo**: Prevents unnecessary re-renders
- **useCallback**: Stable function references
- **useEffect Dependencies**: Efficient effect management
- **Local Storage**: Fast data persistence

### **Best Practices**
- **Component Splitting**: Small, focused components
- **State Minimization**: Only necessary state in components
- **Event Handling**: Efficient callback management
- **CSS Optimization**: Minimal, efficient stylesheets

## 🐛 Troubleshooting

### **Common Issues**
1. **Players not appearing**: Check if player is marked as active
2. **Can't generate matches**: Ensure at least 4 active players
3. **Court removal fails**: Verify court is not occupied
4. **Data not persisting**: Check browser local storage permissions

### **Development Tips**
- **Console Logs**: Check browser console for errors
- **React DevTools**: Use React Developer Tools for debugging
- **Local Storage**: Verify data persistence in browser dev tools

## 🤝 Contributing

### **Development Setup**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### **Code Standards**
- **ES6+**: Use modern JavaScript features
- **React Hooks**: Prefer functional components
- **CSS Variables**: Use design system tokens
- **Component Structure**: Follow established patterns

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **React Team**: For the amazing framework
- **CSS Grid**: For flexible layouts
- **Local Storage API**: For data persistence
- **Badminton Community**: For inspiration and feedback

---

**Built with ❤️ using React.js**