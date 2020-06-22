import { ActionTree, GetterTree, Module, MutationTree } from 'vuex'
import { RootState } from '../index'
import { ChallengeModel, ChallengeType, Difficulty, PracticeMode } from '../../engine/models/math_question'
import { generateExpressionChallenge } from '../../engine/math_questions/expression'
import { Operator } from '../../engine/math_questions/expression/models'
import { evaluate } from 'mathjs'

export interface PracticeOptions {
  difficulty: Difficulty;
  operators: Operator[];
  challengeTypes: ChallengeType[];
}

export enum PracticeGetters {
  QUESTION_LATEX = 'questionLatex',
  ANSWER = 'answer',
  STREAK = 'streak',
  OPERATORS = 'operators',
  DIFFICULTY = 'difficulty',
  PRACTICE_MODE = 'practiceMode',
  PRACTICE_QUESTION_COUNT = 'practiceQuestionCount',
  PRACTICE_TIME = 'practiceTime',
  PRACTICE_TIME_LEFT = 'practiceTimeLeft',
  PRACTICE_CORRECT_QUESTION_COUNT = 'practiceCorrectQuestionCount',
}

export enum PracticeActions {
  INIT = 'init',
  NEW_QUESTION = 'newQuestion',
  SET_ANSWER = 'setAnswer',
  CHECK_ANSWER = 'checkAnswer',
  ON_CORRECT = 'onCorrect',
  ON_INCORRECT = 'onIncorrect',
  SET_PRACTICE_MODE = 'setPracticeMode',
  SET_PRACTICE_QUESTION_COUNT = 'setPracticeQuestionCount',
  SET_PRACTICE_TIME = 'setPracticeTime',
  SET_PRACTICE_TIMER_ID = 'setPracticeTimeId',
  FINISH_PRACTICE_SESSION = 'finishPracticeSession',
  PRACTICE_TIME_TICK = 'practiceTimeTick'
}

enum PracticeMutations {
  SET_PRACTICE_OPTIONS = 'setPracticeOptions',
  SET_QUESTION = 'setQuestion',
  SET_ANSWER = 'setAnswer',
  SET_STREAK = 'setStreak',
  SET_SHOWING_FEEDBACK = 'setShowingFeedback',
  SET_PRACTICE_MODE = 'setPracticeMode',
  SET_PRACTICE_QUESTION_COUNT = 'setPracticeQuestionCount',
  SET_PRACTICE_TIME = 'setPracticeTime',
  SET_PRACTICE_TIME_LEFT = 'setPracticeTimeLeft',
  SET_PRACTICE_TIMER_ID = 'setPracticeTimerId',
  SET_PRACTICE_CORRECT_QUESTION_COUNT = 'setPracticeCorrectQuestionCount',
  RESET_PRACTICE_SESSION = 'resetPracticeSession',
}

export interface PracticeState {
  question: ChallengeModel;
  difficulty: Difficulty;
  operators: Operator[];
  challengeTypes: ChallengeType[];
  answer: string;
  streak: number;

  // We show feedback when the user enters a correct or incorrect answer
  showingFeedback: boolean;

  // We show feedback when the user enters a correct or incorrect answer
  practiceMode: PracticeMode;
  practiceQuestionCount: number;

  // Practice session's time in seconds
  practiceTime: number;
  practiceTimeLeft: number;

  // Keeps track of number of correct questions
  practiceCorrectQuestionCount: number;

  /*
  The ID of the practice session timer. We'll use this value 
  with the clearInterval() method to cancel the timer
  */
  practiceTimerId: number;
}

const getters: GetterTree<PracticeState, any> = {
  questionLatex: (state) => state.question.latex,
  answer: (state) => state.answer,
  streak: (state) => state.streak,
  operators: (state) => state.operators,
  difficulty: (state) => state.difficulty,
  practiceMode: (state) => state.practiceMode,
  practiceQuestionCount: (state) => state.practiceQuestionCount,
  practiceTime: (state) => state.practiceTime,
  practiceTimeLeft: (state) => state.practiceTimeLeft,
  practiceCorrectQuestionCount: (state) => state.practiceCorrectQuestionCount
}

const mutations: MutationTree<PracticeState> = {
  setQuestion(state: PracticeState, question: ChallengeModel) {
    state.question = Object.assign({}, question)
  },
  setAnswer(state: PracticeState, answer: string) {
    state.answer = answer
  },
  setStreak(state: PracticeState, streak: number) {
    state.streak = streak
  },
  setPracticeOptions(state: PracticeState, options: PracticeOptions) {
    state.operators = options.operators
    state.challengeTypes = options.challengeTypes
    state.difficulty = options.difficulty
    state.practiceTimeLeft = state.practiceTime
  },
  setShowingFeedback(state: PracticeState, isShowingFeedback: boolean) {
    state.showingFeedback = isShowingFeedback
  },
  setOperatorEnabled(state: PracticeState, operator: Operator) {
    state.operators.push(operator)
  },
  setOperatorDisabled(state: PracticeState, operator: Operator) {
    state.operators = state.operators.filter(op => op !== operator)
  },
  setPracticeMode(state: PracticeState, mode: PracticeMode) {
    state.practiceMode = mode;
  },
  setPracticeQuestionCount(state: PracticeState, questionCount: number) {
    state.practiceQuestionCount = questionCount;
  },
  setPracticeTime(state: PracticeState, time: number) {
    state.practiceTime = time;
  },
  setPracticeTimeLeft(state: PracticeState, time: number) {
    state.practiceTimeLeft = time;
  },
  setPracticeCorrectQuestionCount(state: PracticeState, count: number) {
    state.practiceCorrectQuestionCount += 1;
  },
  setPracticeTimerId(state: PracticeState, id: number) {
    state.practiceTimerId = id;
  },
  resetPracticeSession(state: PracticeState) {
    state.streak = 0;
    state.practiceCorrectQuestionCount = 0;
    state.practiceTimerId = 0;
    state.practiceTimeLeft = 0;
  }
}

const newQuestion = (difficulty: Difficulty, operators: Operator[]) => {
  return generateExpressionChallenge({ difficulty, operators })
}

const actions: ActionTree<PracticeState, any> = {
  init(context, options: PracticeActions) {
    context.commit(PracticeMutations.SET_PRACTICE_OPTIONS, options)
    if (context.state.practiceMode === PracticeMode.TIME) {
      const practiceTimerId = setInterval(() => context.dispatch(PracticeActions.PRACTICE_TIME_TICK), 1000)
      context.commit(PracticeMutations.SET_PRACTICE_TIMER_ID, practiceTimerId)
    }
  },
  practiceTimeTick(context) {
    const newTimeLeft = context.state.practiceTimeLeft - 1
    if (newTimeLeft == 0) {
      context.dispatch(PracticeActions.FINISH_PRACTICE_SESSION)
    } else {
      context.commit(PracticeMutations.SET_PRACTICE_TIME_LEFT, newTimeLeft)
    }
  },
  newQuestion(context) {
    context.commit(
      PracticeMutations.SET_QUESTION,
      newQuestion(context.state.difficulty, context.state.operators)
    )
  },
  setAnswer(context, answer: string) {
    context.commit(PracticeMutations.SET_ANSWER, answer)
  },
  checkAnswer(context) {
    console.log(context.state.answer)
    console.log(context.state.question.infix)
    if (evaluate(`${context.state.answer} == ${context.state.question.infix}`)) {
      context.dispatch(PracticeActions.ON_CORRECT)
    } else {
      context.dispatch(PracticeActions.ON_INCORRECT)
    }
  },

  /*
 On a correct or incorrect answer, we clear the answer, increment/reset the streak, and set the state of the
 practice session to be in 'Showing Feedback' mode which includes animations or encouragement prompts
 */
  onCorrect(context) {
    context.commit(PracticeMutations.SET_PRACTICE_CORRECT_QUESTION_COUNT, context.state.practiceCorrectQuestionCount + 1)
    context.commit(PracticeMutations.SET_STREAK, context.state.streak + 1)
    context.commit(PracticeMutations.SET_ANSWER, '')
    context.dispatch(PracticeActions.NEW_QUESTION)
    context.commit(PracticeMutations.SET_SHOWING_FEEDBACK, true)
    setTimeout(() => context.commit(PracticeMutations.SET_SHOWING_FEEDBACK, false), 350)
  },
  onIncorrect(context) {
    context.commit(PracticeMutations.SET_STREAK, 0)
    context.commit(PracticeMutations.SET_ANSWER, '')
    context.commit(PracticeMutations.SET_SHOWING_FEEDBACK, true)
    setTimeout(() => context.commit(PracticeMutations.SET_SHOWING_FEEDBACK, false), 350)
  },
  setPracticeMode(context, mode: PracticeMode) {
    context.commit(PracticeMutations.SET_PRACTICE_MODE, mode)
  },
  setPracticeQuestionCount(context, questionCount: number) {
    context.commit(PracticeMutations.SET_PRACTICE_QUESTION_COUNT, questionCount)
  },
  setPracticeTime(context, time: number) {
    context.commit(PracticeMutations.SET_PRACTICE_TIME, time)
  },
  finishPracticeSession(context) {
    clearInterval(context.state.practiceTimerId)
    context.commit(PracticeMutations.RESET_PRACTICE_SESSION)
  }
}

export const PracticeModule: Module<PracticeState, RootState> = {
  state: {
    question: {} as ChallengeModel,
    difficulty: Difficulty.Normal,
    operators: [Operator.Addition, Operator.Subtraction],
    challengeTypes: [],
    answer: '',
    streak: 0,
    showingFeedback: false,
    practiceMode: PracticeMode.TIME,
    practiceQuestionCount: 10,
    practiceTime: 10,
    practiceTimeLeft: 0,
    practiceCorrectQuestionCount: 0,
    practiceTimerId: 0
  },
  getters,
  actions,
  mutations
}
