import stripSuperfluousWhitespace from '../../utils/string/stripSuperfluousWhitespace';
import standardizeKeyName from '../../helpers/parsing-key-maps/standardizeKeyName';
import isValidKey, {InvalidKeyNameError} from '../../helpers/parsing-key-maps/isValidKey';
import normalizedCombinationId from '../../helpers/parsing-key-maps/normalizedCombinationId';

/**
 * Parses KeySequenceStrings and returns KeySequenceOptions
 *
 * Used primarily to parse strings describing hot key sequences and combinations
 * so that they may be matched with key events when they occur.
 * @class
 */
class KeySequenceParser {
  /**
   * @typedef {Object} BasicKeyCombination Object containing the basic information that
   *          describes a key combination
   * @property {KeyCombinationString} id - String description of keys involved in the key
   *          combination
   * @property {number} size - Number of keys involved in the combination
   * @property {Object.<KeyName, Boolean>} keyDictionary - Dictionary of key names involved
   *           in the key combination
   * @property {KeyEventType} keyEventType - Record index for key event that
   *          the matcher should match on
   */

  /**
   * @typedef {string} KeySequenceString String describing a sequence of one or more key
   * combinations with whitespace separating key combinations in the sequence and '+'
   * separating keys within a key combination.
   */

  /**
   * @typedef {KeySequenceString} NormalizedKeySequenceId key sequence id with all of the
   * combination id's normalized
   */

  /**
   * @typedef {Object} BasicKeySequence Object containing the basic information that
   *          describes a key sequence
   * @property {NormalizedKeySequenceId} prefix - Normalized key sequence id
   * @property {number} size - Number of combinations involved in the sequence
   */

  /**
   * @typedef {Object} KeySequenceObject Object containing description of a key sequence
   *          to compared against key events
   * @property {KeySequenceString} id Id describing key sequence used for matching against
   *            key events
   * @property {ComponentId} componentId Id associated with the HotKeys component
   *          that registered the key sequence
   * @property {BasicKeyCombination[]} sequence A list of key combinations involved in
   *            the sequence
   * @property {number} size Number of key combinations in the key sequence
   * @property {KeyEventType} keyEventType Index that matches key event type
   * @property {ActionName} actionName Name of the action that should be triggered if a
   *           keyboard event matching the sequence and event type occur
   */

  /**
   * @typedef {Object} KeySequenceOptions Object containing the results of parsing a
   *          KeySequenceString
   * @property {BasicKeyCombination} combination Properties of the final combination in
   *        the sequence
   * @property {BasicKeySequence} sequence Properties of the sequence of keys leading
   *        up to the final combination
   */

  /**
   * Parses a KeySequenceString and returns a KeySequenceOptions object containing
   * information about the sequence in a format that is easier to query
   * @param {KeySequenceString} sequenceString String describing a key sequence to
   *        parse
   * @param {Object} options Configuration object describing how the KeySequenceString
   *        should be parsed.
   * @param {KeyEventType} options.keyEventType Event record index indicating
   *        what key event the sequence should match
   * @param {boolean} options.ensureValidKeys Whether to throw an exception if an invalid
   *        key name is found in the key combination string.
   * @returns {KeySequenceOptions} Object containing information about the key
   *        sequence described by the KeySequenceString
   */
  static parse(sequenceString, options = {}) {
    const trimmedSequenceString = stripSuperfluousWhitespace(sequenceString);

    const keyCombinationsArray = trimmedSequenceString.split(' ');

    try {
      const nonTerminalCombinations = keyCombinationsArray.slice(0, keyCombinationsArray.length-1);
      const terminalCombination = keyCombinationsArray[keyCombinationsArray.length-1];

      const prefix = nonTerminalCombinations.map((keyCombination) => {
        const keysInComboDict = parseCombination(keyCombination, options);

        return normalizedCombinationId(keysInComboDict);
      }).join(' ');

      const keysInComboDict = parseCombination(terminalCombination, options);

      const normalizedComboString = normalizedCombinationId(keysInComboDict);

      const combination = {
        id: normalizedComboString,
        keyDictionary: keysInComboDict,
        keyEventType: options.keyEventType,
        size: Object.keys(keysInComboDict).length
      };

      return { sequence: { prefix, size: nonTerminalCombinations.length + 1 }, combination };
    } catch (InvalidKeyNameError) {
      return { sequence: null, combination: null }
    }
  }
}

/**
 * @typedef {string} KeyCombinationString String describing a combination of one or more
 * keys separated by '+'
 */

/**
 * @typedef {KeyCombinationString} NormalizedKeyCombinationString key combination id where
 * the keys have been normalized (sorted in alphabetical order)
 */

/**
 * @typedef {Object.<ReactKeyName, Boolean>} KeyDictionary Registry of the names
 * of keys in a particular combination, for easy/quick checking if a particular
 * key is in the key combination
 */

/**
 * Parses a key combination string and returns the corresponding KeyDictionary
 * @param {KeyCombinationString} string Describes key combination
 * @param {Object} options Options hash of how the string should be parsed
 * @param {boolean} options.ensureValidKeys Whether to throw an exception if an invalid
 *        key name is found in the key combination string.
 * @returns {KeyDictionary} Dictionary of keys in the parsed combination
 */
function parseCombination(string, options = {}) {
  const shiftPressed = string.indexOf(/[sS]hift/) !== -1;
  const altPressed = string.indexOf(/[aA]lt/) !== -1;

  return string.replace(/^\+|(\s|[^+]\+)\+/, '$1plus').split('+').reduce((keyDictionary, keyName) => {
    let finalKeyName = standardizeKeyName(keyName, {
      shift: shiftPressed,
      alt: altPressed
    });

    if (options.ensureValidKeys) {
      if (!isValidKey(finalKeyName)) {
        throw new InvalidKeyNameError();
      }
    }

    keyDictionary[finalKeyName] = true;

    return keyDictionary;
  }, {});
}

export default KeySequenceParser;
