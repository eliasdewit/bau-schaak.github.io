
const boardElement = document.getElementById('chessboard');
let selectedSquare = null;
let turn = 'white'; // 'white' of 'black'

// Houd bij of stukken die nodig zijn voor rokade hebben bewogen
const hasMoved = {
    'white_king': false,
    'white_rook_left': false,
    'white_rook_right': false,
    'black_king': false,
    'black_rook_left': false,
    'black_rook_right': false
};

// Houd de laatste zet bij voor en passant
let lastMove = null;

// Klok instellingen
let whiteTime = 600; 
let blackTime = 600;
let timerInterval = null;
let gameEnded = true; // Zet op true tot een tijd gekozen is
let timerStarted = false; // Nieuwe vlag om te wachten tot de eerste zet

function startGame(minutes) {
    const seconds = minutes * 60;
    whiteTime = seconds;
    blackTime = seconds;
    gameEnded = false;
    timerStarted = true; // Direct starten
    
    // Verberg het startscherm
    document.getElementById('start-screen').style.display = 'none';
    
    // Initialiseer bord en klokken
    updateClockDisplay();
    updateClockVisuals();
    createBoard();
    startTimer(); // Start de klok direct
}

const pieces = {
    // Wit (blauw) op rij 6 en 7 (0-indexed)
    '0,7': 'R', '1,7': 'N', '2,7': 'B', '3,7': 'Q', '4,7': 'K', '5,7': 'B', '6,7': 'N', '7,7': 'R',
    '0,6': 'P', '1,6': 'P', '2,6': 'P', '3,6': 'P', '4,6': 'P', '5,6': 'P', '6,6': 'P', '7,6': 'P',
    // Zwart (wit) op rij 0 en 1
    '0,0': 'r', '1,0': 'n', '2,0': 'b', '3,0': 'q', '4,0': 'k', '5,0': 'b', '6,0': 'n', '7,0': 'r',
    '0,1': 'p', '1,1': 'p', '2,1': 'p', '3,1': 'p', '4,1': 'p', '5,1': 'p', '6,1': 'p', '7,1': 'p'
};

const pieceTypes = {
    'R': 'rook', 'N': 'knight', 'B': 'bishop', 'Q': 'queen', 'K': 'king', 'P': 'pawn',
    'r': 'rook', 'n': 'knight', 'b': 'bishop', 'q': 'queen', 'k': 'king', 'p': 'pawn'
};

function createBoard() {
    boardElement.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.classList.add('square');
            
            if ((row + col) % 2 === 0) {
                square.classList.add('white');
            } else {
                square.classList.add('black');
            }
            
            square.dataset.row = row;
            square.dataset.col = col;
            square.addEventListener('click', () => handleSquareClick(row, col));

            const pieceKey = `${col},${row}`;
            if (pieces[pieceKey]) {
                const pieceChar = pieces[pieceKey];
                const pieceType = pieceTypes[pieceChar];
                const isWhite = pieceChar === pieceChar.toUpperCase();
                
                // Markeer de koning als hij schaak staat of schaakmat
                if (pieceType === 'king') {
                    const color = isWhite ? 'white' : 'black';
                    if (isKingInCheck(color)) {
                        square.classList.add('in-check');
                        if (isCheckmate(color)) {
                            square.classList.add('checkmate');
                        }
                    }
                }

                const piece = document.createElement('div');
                piece.classList.add('piece');
                piece.classList.add(isWhite ? 'white-piece' : 'black-piece');
                piece.classList.add(`piece-${pieceType}`);
                
                const shape = document.createElement('div');
                shape.classList.add('shape');
                piece.appendChild(shape);
                
                square.appendChild(piece);
            }
            
            boardElement.appendChild(square);
        }
    }
}

function handleSquareClick(row, col) {
    const squareKey = `${col},${row}`;
    const piece = pieces[squareKey];

    // Als er al een vakje geselecteerd is
    if (selectedSquare) {
        const moves = getValidMoves(selectedSquare.row, selectedSquare.col);
        const move = moves.find(m => m.row === row && m.col === col);

        if (move) {
            movePiece(selectedSquare.row, selectedSquare.col, row, col, move.isCastling, move.isEnPassant);
            selectedSquare = null;
            clearHighlights();
            createBoard();
            return;
        }
    }

    // Selecteer een nieuw stuk (pionnen, paarden, dame, torens, lopers en koning)
    if (piece && isCorrectTurn(piece) && !gameEnded) {
        const pieceLower = piece.toLowerCase();
        const selectablePieces = ['p', 'n', 'q', 'r', 'b', 'k'];
        if (selectablePieces.includes(pieceLower)) {
            clearHighlights();
            selectedSquare = { row, col };
            highlightSquare(row, col, 'selected');
            const moves = getValidMoves(row, col);
            moves.forEach(m => highlightSquare(m.row, m.col, 'valid-move'));
        }
    } else {
        selectedSquare = null;
        clearHighlights();
    }
}

function isCorrectTurn(piece) {
    const isWhitePiece = piece === piece.toUpperCase();
    return (turn === 'white' && isWhitePiece) || (turn === 'black' && !isWhitePiece);
}

function getValidMoves(row, col, checkSafety = true) {
    const pieceKey = `${col},${row}`;
    const piece = pieces[pieceKey];
    const moves = [];

    if (!piece) return moves;

    const isWhite = piece === piece.toUpperCase();
    const pieceLower = piece.toLowerCase();

    if (pieceLower === 'p') {
        const direction = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;

        // 1 stap vooruit
        const nextRow = row + direction;
        if (nextRow >= 0 && nextRow < 8 && !pieces[`${col},${nextRow}`]) {
            moves.push({ row: nextRow, col: col });
            // 2 stappen vooruit (alleen vanaf startpositie)
            const doubleNextRow = row + 2 * direction;
            if (row === startRow && !pieces[`${col},${doubleNextRow}`] && !pieces[`${col},${nextRow}`]) {
                moves.push({ row: doubleNextRow, col: col });
            }
        }

        // Diagonaal slaan
        const attackCols = [col - 1, col + 1];
        attackCols.forEach(aCol => {
            if (aCol >= 0 && aCol < 8 && nextRow >= 0 && nextRow < 8) {
                const targetPiece = pieces[`${aCol},${nextRow}`];
                if (targetPiece && ((isWhite && targetPiece === targetPiece.toLowerCase()) || (!isWhite && targetPiece === targetPiece.toUpperCase()))) {
                    moves.push({ row: nextRow, col: aCol });
                }
                
                // En Passant
                if (!targetPiece && lastMove && lastMove.piece.toLowerCase() === 'p' && 
                    lastMove.toRow === row && lastMove.toCol === aCol &&
                    Math.abs(lastMove.fromRow - lastMove.toRow) === 2) {
                    moves.push({ row: nextRow, col: aCol, isEnPassant: true });
                }
            }
        });
    }

    if (pieceLower === 'n') {
        const knightMoves = [
            { r: -2, c: -1 }, { r: -2, c: 1 },
            { r: -1, c: -2 }, { r: -1, c: 2 },
            { r: 1, c: -2 }, { r: 1, c: 2 },
            { r: 2, c: -1 }, { r: 2, c: 1 }
        ];

        knightMoves.forEach(m => {
            const targetRow = row + m.r;
            const targetCol = col + m.c;

            if (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
                const targetPiece = pieces[`${targetCol},${targetRow}`];
                if (!targetPiece || (isWhite && targetPiece === targetPiece.toLowerCase()) || (!isWhite && targetPiece === targetPiece.toUpperCase())) {
                    moves.push({ row: targetRow, col: targetCol });
                }
            }
        });
    }

    if (pieceLower === 'r' || pieceLower === 'q') {
        const directions = [
            { r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }
        ];

        directions.forEach(d => {
            let targetRow = row + d.r;
            let targetCol = col + d.c;

            while (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
                const targetPiece = pieces[`${targetCol},${targetRow}`];
                if (!targetPiece) {
                    moves.push({ row: targetRow, col: targetCol });
                } else {
                    const isEnemy = (isWhite && targetPiece === targetPiece.toLowerCase()) || (!isWhite && targetPiece === targetPiece.toUpperCase());
                    if (isEnemy) moves.push({ row: targetRow, col: targetCol });
                    break;
                }
                targetRow += d.r;
                targetCol += d.c;
            }
        });
    }

    if (pieceLower === 'b' || pieceLower === 'q') {
        const directions = [
            { r: -1, c: -1 }, { r: -1, c: 1 }, { r: 1, c: -1 }, { r: 1, c: 1 }
        ];

        directions.forEach(d => {
            let targetRow = row + d.r;
            let targetCol = col + d.c;

            while (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
                const targetPiece = pieces[`${targetCol},${targetRow}`];
                if (!targetPiece) {
                    moves.push({ row: targetRow, col: targetCol });
                } else {
                    const isEnemy = (isWhite && targetPiece === targetPiece.toLowerCase()) || (!isWhite && targetPiece === targetPiece.toUpperCase());
                    if (isEnemy) moves.push({ row: targetRow, col: targetCol });
                    break;
                }
                targetRow += d.r;
                targetCol += d.c;
            }
        });
    }

    if (pieceLower === 'k') {
        const directions = [
            { r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 },
            { r: -1, c: -1 }, { r: -1, c: 1 }, { r: 1, c: -1 }, { r: 1, c: 1 }
        ];

        directions.forEach(d => {
            const targetRow = row + d.r;
            const targetCol = col + d.c;

            if (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
                const targetPiece = pieces[`${targetCol},${targetRow}`];
                if (!targetPiece || (isWhite && targetPiece === targetPiece.toLowerCase()) || (!isWhite && targetPiece === targetPiece.toUpperCase())) {
                    moves.push({ row: targetRow, col: targetCol });
                }
            }
        });

        // Rokade logica
        if (checkSafety && !isKingInCheck(isWhite ? 'white' : 'black')) {
            const colorPrefix = isWhite ? 'white' : 'black';
            const rookChar = isWhite ? 'R' : 'r';
            
            // Koningsvleugel (kort)
            if (!hasMoved[`${colorPrefix}_king`] && !hasMoved[`${colorPrefix}_rook_right`]) {
                const rookPos = isWhite ? '7,7' : '7,0';
                if (pieces[rookPos] === rookChar) {
                    const square1 = { row: row, col: col + 1 };
                    const square2 = { row: row, col: col + 2 };
                    if (!pieces[`${square1.col},${square1.row}`] && !pieces[`${square2.col},${square2.row}`]) {
                        if (!isSquareAttacked(square1.row, square1.col, isWhite ? 'black' : 'white') &&
                            !isSquareAttacked(square2.row, square2.col, isWhite ? 'black' : 'white')) {
                            moves.push({ row: square2.row, col: square2.col, isCastling: true });
                        }
                    }
                }
            }

            // Damevleugel (lang)
            if (!hasMoved[`${colorPrefix}_king`] && !hasMoved[`${colorPrefix}_rook_left`]) {
                const rookPos = isWhite ? '0,7' : '0,0';
                if (pieces[rookPos] === rookChar) {
                    const square1 = { row: row, col: col - 1 };
                    const square2 = { row: row, col: col - 2 };
                    const square3 = { row: row, col: col - 3 };
                    if (!pieces[`${square1.col},${square1.row}`] && !pieces[`${square2.col},${square2.row}`] && !pieces[`${square3.col},${square3.row}`]) {
                        if (!isSquareAttacked(square1.row, square1.col, isWhite ? 'black' : 'white') &&
                            !isSquareAttacked(square2.row, square2.col, isWhite ? 'black' : 'white')) {
                            moves.push({ row: square2.row, col: square2.col, isCastling: true });
                        }
                    }
                }
            }
        }
    }

    // Filter zetten die de eigen koning in schaak laten staan
    if (checkSafety) {
        return moves.filter(m => {
            const originalPiece = pieces[`${m.col},${m.row}`];
            const movingPiece = pieces[`${col},${row}`];
            
            // Simuleer de zet
            delete pieces[`${col},${row}`];
            pieces[`${m.col},${m.row}`] = movingPiece;
            
            // Simuleer verwijderen van geslagen pion bij en passant
            let capturedEnPassant = null;
            if (m.isEnPassant) {
                const direction = isWhite ? 1 : -1;
                capturedEnPassant = pieces[`${m.col},${m.row + direction}`];
                delete pieces[`${m.col},${m.row + direction}`];
            }
            
            const isSafe = !isKingInCheck(isWhite ? 'white' : 'black');
            
            // Zet de staat terug
            pieces[`${col},${row}`] = movingPiece;
            if (originalPiece) {
                pieces[`${m.col},${m.row}`] = originalPiece;
            } else {
                delete pieces[`${m.col},${m.row}`];
            }
            
            if (m.isEnPassant) {
                const direction = isWhite ? 1 : -1;
                pieces[`${m.col},${m.row + direction}`] = capturedEnPassant;
            }
            
            return isSafe;
        });
    }

    return moves;
}

function isCheckmate(color) {
    if (!isKingInCheck(color)) return false;

    // Check of er nog een geldige zet is voor deze kleur
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = pieces[`${c},${r}`];
            if (piece) {
                const isWhite = piece === piece.toUpperCase();
                const pieceColor = isWhite ? 'white' : 'black';
                if (pieceColor === color) {
                    const moves = getValidMoves(r, c, true);
                    if (moves.length > 0) return false;
                }
            }
        }
    }
    return true;
}

function isKingInCheck(color) {
    // Zoek de koning
    let kingPos = null;
    const kingChar = color === 'white' ? 'K' : 'k';
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (pieces[`${c},${r}`] === kingChar) {
                kingPos = { row: r, col: c };
                break;
            }
        }
        if (kingPos) break;
    }
    
    if (!kingPos) return false; // Zou niet moeten gebeuren in schaak
    
    const enemyColor = color === 'white' ? 'black' : 'white';
    return isSquareAttacked(kingPos.row, kingPos.col, enemyColor);
}

function isSquareAttacked(row, col, attackerColor) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = pieces[`${c},${r}`];
            if (piece) {
                const isWhite = piece === piece.toUpperCase();
                const pieceColor = isWhite ? 'white' : 'black';
                
                if (pieceColor === attackerColor) {
                    // Voor pionnen is de aanval anders dan de gewone zet (diagonaal)
                    if (piece.toLowerCase() === 'p') {
                        const direction = isWhite ? -1 : 1;
                        const attackRow = r + direction;
                        if (attackRow === row && (c - 1 === col || c + 1 === col)) {
                            return true;
                        }
                    } else {
                        // Voor andere stukken checken we hun mogelijke zetten (zonder veiligheid-check)
                        const moves = getValidMoves(r, c, false);
                        if (moves.some(m => m.row === row && m.col === col)) {
                            return true;
                        }
                    }
                }
            }
        }
    }
    return false;
}

function movePiece(fromRow, fromCol, toRow, toCol, isCastling = false, isEnPassant = false) {
    const piece = pieces[`${fromCol},${fromRow}`];
    const isWhite = piece === piece.toUpperCase();
    const pieceLower = piece.toLowerCase();
    const colorPrefix = isWhite ? 'white' : 'black';

    // Rokade uitvoering
    if (isCastling) {
        if (toCol === 6) { // Kort
            const rookFrom = `7,${fromRow}`;
            const rookTo = `5,${fromRow}`;
            pieces[rookTo] = pieces[rookFrom];
            delete pieces[rookFrom];
            hasMoved[`${colorPrefix}_rook_right`] = true;
        } else if (toCol === 2) { // Lang
            const rookFrom = `0,${fromRow}`;
            const rookTo = `3,${fromRow}`;
            pieces[rookTo] = pieces[rookFrom];
            delete pieces[rookFrom];
            hasMoved[`${colorPrefix}_rook_left`] = true;
        }
    }

    // En Passant uitvoering
    if (isEnPassant) {
        const direction = isWhite ? 1 : -1;
        delete pieces[`${toCol},${toRow + direction}`];
    }

    // Update hasMoved status
    if (pieceLower === 'k') {
        hasMoved[`${colorPrefix}_king`] = true;
    } else if (pieceLower === 'r') {
        if (fromCol === 0) hasMoved[`${colorPrefix}_rook_left`] = true;
        if (fromCol === 7) hasMoved[`${colorPrefix}_rook_right`] = true;
    }

    // Sla de laatste zet op voor en passant (moet vóór het verplaatsen of met de oude waarden)
    lastMove = {
        piece: piece,
        fromRow: fromRow,
        fromCol: fromCol,
        toRow: toRow,
        toCol: toCol
    };

    delete pieces[`${fromCol},${fromRow}`];
    pieces[`${toCol},${toRow}`] = piece;
    
    // Na de zet, check of de andere speler nu schaak staat of schaakmat
    const otherColor = turn === 'white' ? 'black' : 'white';
    if (isKingInCheck(otherColor)) {
        if (isCheckmate(otherColor)) {
            console.log(`${otherColor} staat SCHAAKMAT!`);
            gameEnded = true;
            clearInterval(timerInterval);
        } else {
            console.log(`${otherColor} staat SCHAAK!`);
        }
    }

    turn = turn === 'white' ? 'black' : 'white';
    updateClockVisuals();
    if (timerStarted) {
        startTimer();
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    if (gameEnded) return;

    timerInterval = setInterval(() => {
        if (turn === 'white') {
            whiteTime--;
            if (whiteTime <= 0) endGame('black');
        } else {
            blackTime--;
            if (blackTime <= 0) endGame('white');
        }
        updateClockDisplay();
    }, 1000);
}

function updateClockDisplay() {
    document.querySelector('#white-clock .time').textContent = formatTime(whiteTime);
    document.querySelector('#black-clock .time').textContent = formatTime(blackTime);
}

function formatTime(seconds) {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateClockVisuals() {
    const whiteClock = document.getElementById('white-clock');
    const blackClock = document.getElementById('black-clock');
    
    if (turn === 'white') {
        whiteClock.classList.add('active');
        blackClock.classList.remove('active');
    } else {
        blackClock.classList.add('active');
        whiteClock.classList.remove('active');
    }
}

function endGame(winner) {
    gameEnded = true;
    clearInterval(timerInterval);
    console.log(`Game Over! Winnaar: ${winner}`);
    // Je zou hier eventueel nog een visuele melding kunnen toevoegen
}

function highlightSquare(row, col, className) {
    const squares = boardElement.getElementsByClassName('square');
    const index = row * 8 + col;
    if (squares[index]) {
        squares[index].classList.add(className);
    }
}

function clearHighlights() {
    const squares = boardElement.getElementsByClassName('square');
    for (let s of squares) {
        s.classList.remove('selected');
        s.classList.remove('valid-move');
    }
}

