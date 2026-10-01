import { HomeAssistantExt } from "../type-extensions";
import { log, safeGetArray } from "../utils";

/**
 * Gets flag indicating charging mode
 * @param config Entity config
 * @param state Battery level/state
 * @param hass HomeAssistant state object
 * @returns Whether battery is in charging mode
 */
 export const getChargingState = (config: IBatteryEntityConfig, state: string, hass: HomeAssistantExt, siblings?: ISiblingEntity[]): boolean => {
    const chargingConfig = config.charging_state;
    if (!chargingConfig) {
        return getDefaultChargingState(config.entity, hass, siblings);
    }

    let entityWithChargingState = hass.states[config.entity];

    if (!entityWithChargingState) {
        log(`Entity (${config.entity}) not found.`, "error");
        return false;
    }

    // check whether we should use different entity to get charging state
    if (chargingConfig.entity_id) {
        entityWithChargingState = hass.states[chargingConfig.entity_id]
        if (!entityWithChargingState) {
            log(`'charging_state' entity id (${chargingConfig.entity_id}) not found.`, "error");
            return false;
        }

        state = entityWithChargingState.state;
    }

    const attributesLookup = safeGetArray(chargingConfig.attribute);
    // check if we should take the state from attribute
    if (attributesLookup.length != 0) {
        // take first attribute name which exists on entity
        const existingAttribute = attributesLookup.find(attr => getValueFromJsonPath(entityWithChargingState.attributes, attr.name) !== undefined);
        if (existingAttribute) {
            return existingAttribute.value !== undefined ?
                getValueFromJsonPath(entityWithChargingState.attributes, existingAttribute.name) == existingAttribute.value :
                true;
        }
        else {
            // if there is no attribute indicating charging it means the charging state is false
            return false;
        }
    }

    const statesIndicatingCharging = safeGetArray(chargingConfig.state);

    return statesIndicatingCharging.length == 0 ? !!state : statesIndicatingCharging.some(s => s == state);
}

/**
 * Charge-state sensor values (lower-cased) meaning the device is on the charger
 */
const chargingStates = ["charging", "full", "full_charge"];

const unknownStates = ["unavailable", "unknown", ""];

const getDefaultChargingState = (entityId: string, hass?: HomeAssistantExt, siblings?: ISiblingEntity[]): boolean => {
    if (!hass || !siblings || siblings.length === 0) {
        return false;
    }

    const chargingEntity = findChargingEntity(entityId, hass, siblings);
    if (!chargingEntity) {
        return false;
    }

    const state = hass.states[chargingEntity.entity_id].state;

    return isBinarySensor(chargingEntity) ?
        state === "on" :
        chargingStates.includes(state.toLowerCase());
}

/**
 * Picks the sibling entity which is the most reliable source of the charging state
 * @param entityId Battery entity id
 * @param hass HomeAssistant state object
 * @param siblings Other entities of the battery's device
 * @returns Sibling entity holding the charging state
 */
const findChargingEntity = (entityId: string, hass: HomeAssistantExt, siblings: ISiblingEntity[]): ISiblingEntity | undefined => {
    // entities in unknown state can't tell anything, so let the next source have a go
    const candidates = siblings.filter(s => {
        const state = hass.states[s.entity_id]?.state;
        return state !== undefined && !unknownStates.includes(state);
    });

    // state sensor named after the battery one e.g. mobile_app's sensor.phone_battery_level -> sensor.phone_battery_state
    // (a device can have more batteries e.g. iPhone reporting the paired watch one)
    const pairedEntityId = entityId.replace(/_level$/, "_state");

    return candidates.find(s => pairedEntityId !== entityId && s.entity_id === pairedEntityId)
        || candidates.find(s => isBinarySensor(s) && s.device_class === "battery_charging")
        || candidates.find(s => s.device_class === "enum" && hasChargingOption(hass, s))
        || candidates.find(s => isBinarySensor(s) && s.device_class === "plug");
}

const isBinarySensor = (entity: ISiblingEntity) => entity.entity_id.startsWith("binary_sensor.");

/**
 * Checks whether enum sensor can report charging (to skip enums like vacuum error or current room)
 */
const hasChargingOption = (hass: HomeAssistantExt, entity: ISiblingEntity): boolean => {
    const options = hass.states[entity.entity_id].attributes?.options;
    return !Array.isArray(options) || options.some(o => chargingStates.includes(String(o).toLowerCase()));
}

/**
 * Returns value from given object and the path
 * @param data Data
 * @param path JSON path
 * @returns Value from the path
 */
 const getValueFromJsonPath = (data: any, path: string) => {
    if (data === undefined) {
        return data;
    }

    path.split(".").forEach(chunk => {
        data = data ? data[chunk] : undefined;
    });

    return data;
}